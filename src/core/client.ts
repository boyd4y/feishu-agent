import { AuthManager } from "./auth-manager";
import { FeishuConfig, FeishuError } from "../types";

export class FeishuClient {
  private authManager: AuthManager;
  private baseUrl: string;

  constructor(config: FeishuConfig) {
    this.authManager = new AuthManager(config);
    this.baseUrl = config.baseUrl || "https://open.feishu.cn";
  }

  /**
   * Check if user has authorized (has user_access_token)
   */
  hasUserToken(): boolean {
    return this.authManager.hasUserToken();
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<{ user_id: string; name: string } | null> {
    return this.authManager.getCurrentUser();
  }

  private async request<T>(path: string, options: RequestInit = {}, useUserToken = false): Promise<T> {
    // Use user_access_token for user-level APIs (calendar, etc.)
    const token = useUserToken
      ? await this.authManager.getUserAccessToken()
      : await this.authManager.getTenantAccessToken();
    const url = `${this.baseUrl}${path}`;

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      ...options.headers,
    };

    // Add 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          // Try to extract permission info if it exists
          let errorMsg = `Request failed: ${response.statusText}`;
          if (errorData.code) {
             errorMsg = `Feishu API Error: ${errorData.msg} (Code: ${errorData.code})`;
          } else if (errorData.error && errorData.error.message) {
             errorMsg = `Feishu API Error: ${errorData.error.message}`;
          }

          throw new FeishuError(errorMsg, errorData.code || response.status, errorData);
        } catch (e) {
          if (e instanceof FeishuError) throw e;
          // If JSON parsing fails, fall back to status text
          throw new FeishuError(`Request failed: ${response.statusText}`, response.status);
        }
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new FeishuError(`Feishu API Error: ${data.msg}`, data.code, data);
      }

      return data.data as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after 30s: ${path}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(path: string, params?: Record<string, string>, useUserToken = false): Promise<T> {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<T>(`${path}${queryString}`, { method: "GET" }, useUserToken);
  }

  async post<T>(path: string, body: any, params?: Record<string, string>, useUserToken = false): Promise<T> {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<T>(`${path}${queryString}`, {
      method: "POST",
      body: JSON.stringify(body),
    }, useUserToken);
  }

}
