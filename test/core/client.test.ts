import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import { FeishuClient } from "../../src/core/client";
import { FeishuError } from "../../src/types";

describe("FeishuClient", () => {
  const config = {
    appId: "test-app-id",
    appSecret: "test-app-secret",
    baseUrl: "https://open.feishu.cn",
  };

  let client: FeishuClient;

  beforeEach(() => {
    client = new FeishuClient(config);
    // Reset global fetch mock before each test
    global.fetch = mock();
  });

  it("should handle get request with auth token and query params", async () => {
    // Mock auth token request
    const mockFetch = global.fetch as any;
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 0,
        msg: "success",
        tenant_access_token: "mock-token",
        expire: 7200,
      })))
      // Mock actual GET request
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 0,
        msg: "success",
        data: { foo: "bar" },
      })));

    const result = await client.get("/test-path", { key: "value" });

    expect(result).toEqual({ foo: "bar" });
    
    // Verify auth request
    expect(mockFetch).toHaveBeenCalledWith(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          app_id: config.appId,
          app_secret: config.appSecret,
        }),
      })
    );

    // Verify GET request
    expect(mockFetch).toHaveBeenLastCalledWith(
      "https://open.feishu.cn/test-path?key=value",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Authorization": "Bearer mock-token",
          "Content-Type": "application/json; charset=utf-8",
        }),
      })
    );
  });

  it("should handle post request with auth token and body", async () => {
    const mockFetch = global.fetch as any;
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 0,
        msg: "success",
        tenant_access_token: "mock-token",
        expire: 7200,
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 0,
        msg: "success",
        data: { success: true },
      })));

    const body = { hello: "world" };
    const result = await client.post("/test-post", body);

    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenLastCalledWith(
      "https://open.feishu.cn/test-post",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          "Authorization": "Bearer mock-token",
        }),
      })
    );
  });

  it("should throw FeishuError when API returns non-zero code", async () => {
    const mockFetch = global.fetch as any;
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 0,
        msg: "success",
        tenant_access_token: "mock-token",
        expire: 7200,
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 999,
        msg: "some error",
      })));

    try {
      await client.get("/error-path");
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(FeishuError);
      expect((error as FeishuError).code).toBe(999);
      expect((error as FeishuError).message).toContain("some error");
    }
  });

  it("should throw FeishuError when HTTP response is not ok", async () => {
    const mockFetch = global.fetch as any;
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 0,
        msg: "success",
        tenant_access_token: "mock-token",
        expire: 7200,
      })))
      .mockResolvedValueOnce(new Response(null, {
        status: 500,
        statusText: "Internal Server Error",
      }));

    try {
      await client.get("/500-path");
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(FeishuError);
      expect((error as FeishuError).code).toBe(500);
      expect((error as FeishuError).message).toContain("Internal Server Error");
    }
  });

  it("should throw Error on network failure", async () => {
    const mockFetch = global.fetch as any;
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 0,
        msg: "success",
        tenant_access_token: "mock-token",
        expire: 7200,
      })))
      .mockRejectedValueOnce(new Error("Network Error"));

    try {
      await client.get("/network-error");
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Network Error");
    }
  });
});
