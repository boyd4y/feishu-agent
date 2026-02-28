import { FeishuConfig, TenantAccessTokenResponse, FeishuError } from "../types";

interface UserToken {
  accessToken: string;
  refreshToken: string;
  expireTime: number;
}

export class AuthManager {
  private config: FeishuConfig;
  private tenantToken: string | null = null;
  private tenantExpireTime: number = 0;
  private userToken: UserToken | null = null;

  constructor(config: FeishuConfig) {
    this.config = config;
    // If userAccessToken and refreshToken are provided, store them
    // Token will be refreshed on first use if expired
    if (config.userAccessToken && config.refreshToken) {
      this.userToken = {
        accessToken: config.userAccessToken,
        refreshToken: config.refreshToken,
        expireTime: 0, // Mark as expired to force refresh on first use
      };
    }
  }

  /**
   * Get tenant access token (for app-level API calls)
   */
  async getTenantAccessToken(): Promise<string> {
    if (this.tenantToken && Date.now() < this.tenantExpireTime) {
      return this.tenantToken;
    }

    return this.refreshTenantToken();
  }

  /**
   * Get user access token (for user-level API calls like calendar)
   * Automatically refreshes if expired
   */
  async getUserAccessToken(): Promise<string> {
    if (!this.userToken) {
      throw new FeishuError("User access token not configured", 401);
    }

    // Refresh if expired (with 5 min buffer)
    if (Date.now() >= this.userToken.expireTime - 300000) {
      await this.refreshUserToken();
    }

    return this.userToken.accessToken;
  }

  /**
   * Check if user has authorized (has user_access_token)
   */
  hasUserToken(): boolean {
    return this.userToken !== null;
  }

  /**
   * Get current user info from token
   */
  async getCurrentUser(): Promise<{ user_id: string; union_id: string; open_id: string; name: string } | null> {
    if (!this.userToken) {
      return null;
    }

    // Fetch user info using the access token
    try {
      const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
        headers: {
          "Authorization": `Bearer ${this.userToken.accessToken}`,
        },
      });

      const data = await response.json();
      if (data.code === 0 && data.data) {
        return {
          user_id: data.data.user_id,
          union_id: data.data.union_id,
          open_id: data.data.open_id,
          name: data.data.name,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async refreshTenantToken(): Promise<string> {
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

      this.tenantToken = data.tenant_access_token;
      // Expire time is in seconds, convert to ms. Subtract buffer (e.g., 5 mins) to be safe.
      this.tenantExpireTime = Date.now() + (data.expire * 1000) - 300000;

      return this.tenantToken;
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

  private async refreshUserToken(): Promise<UserToken> {
    if (!this.userToken?.refreshToken) {
      throw new FeishuError("Refresh token not available", 401);
    }

    const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/refresh_access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: this.userToken.refreshToken,
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new FeishuError(`Failed to refresh user token: ${data.msg}`, data.code);
    }

    // Update user token
    const newToken: UserToken = {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token || this.userToken.refreshToken,
      expireTime: Date.now() + (data.data.expires_in * 1000),
    };

    this.userToken = newToken;

    // Save updated token to config file
    await this.saveUserToken(newToken);

    return newToken;
  }

  private async saveUserToken(token: UserToken): Promise<void> {
    // Try to save to local config first, then global config
    try {
      const { writeFile, readFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const { homedir } = await import("os");

      // Try local config
      const localConfigPath = ".feishu_agent/config.json";
      try {
        const content = await readFile(localConfigPath, "utf-8");
        const config = JSON.parse(content);
        config.userAccessToken = token.accessToken;
        config.refreshToken = token.refreshToken;
        await mkdir(".feishu_agent", { recursive: true });
        await writeFile(localConfigPath, JSON.stringify(config, null, 2));
        return;
      } catch {
        // Local config doesn't exist, try global config
      }

      // Global config
      const globalConfigPath = join(homedir(), ".feishu-agent", "config.json");
      const content = await readFile(globalConfigPath, "utf-8");
      const config = JSON.parse(content);
      config.userAccessToken = token.accessToken;
      config.refreshToken = token.refreshToken;
      await writeFile(globalConfigPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error("Warning: Failed to save updated tokens to config file.");
      console.error("Tokens will need to be refreshed again on next run.");
    }
  }
}
