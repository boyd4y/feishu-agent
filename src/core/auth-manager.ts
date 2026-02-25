import { FeishuConfig, TenantAccessTokenResponse, FeishuError } from "../types";

export class AuthManager {
  private config: FeishuConfig;
  private token: string | null = null;
  private expireTime: number = 0;

  constructor(config: FeishuConfig) {
    this.config = config;
  }

  async getTenantAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.expireTime) {
      return this.token;
    }

    return this.refreshToken();
  }


  private async refreshToken(): Promise<string> {
    const url = `${this.config.baseUrl || "https://open.feishu.cn"}/open-apis/auth/v3/tenant_access_token/internal`;
    
    // Add 10s timeout for auth
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new FeishuError(`Auth request failed: ${response.statusText}`, response.status);
      }

      const data = await response.json() as TenantAccessTokenResponse;

      if (data.code !== 0) {
        throw new FeishuError(`Feishu API Error: ${data.msg}`, data.code);
      }

      this.token = data.tenant_access_token;
      // Expire time is in seconds, convert to ms. Subtract buffer (e.g., 5 mins) to be safe.
      this.expireTime = Date.now() + (data.expire * 1000) - 300000;

      return this.token;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error("Auth token refresh timed out after 10s");
      }
      if (error instanceof FeishuError) {
        throw error;
      }
      throw new Error(`Failed to refresh token: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
