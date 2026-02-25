import { AuthManager } from "./auth-manager";
import { FeishuConfig, FeishuError } from "../types";

export class FeishuClient {
  private authManager: AuthManager;
  private baseUrl: string;

  constructor(config: FeishuConfig) {
    this.authManager = new AuthManager(config);
    this.baseUrl = config.baseUrl || "https://open.feishu.cn";
  }


  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.authManager.getTenantAccessToken();
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
        throw new FeishuError(`Request failed: ${response.statusText}`, response.status);
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new FeishuError(`Feishu API Error: ${data.msg}`, data.code);
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

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<T>(`${path}${queryString}`, { method: "GET" });
  }

  async post<T>(path: string, body: any): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}
