import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from "bun:test";
import { AuthManager } from "../../src/core/auth-manager";
import { FeishuError } from "../../src/types";

describe("AuthManager", () => {
  const config = {
    appId: "test-app-id",
    appSecret: "test-app-secret",
  };

  let authManager: AuthManager;
  let dateNowSpy: any;

  beforeEach(() => {
    authManager = new AuthManager(config);
    dateNowSpy = spyOn(Date, "now");
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    mock.restore();
  });

  it("should fetch a new token if no token exists", async () => {
    const mockResponse = {
      code: 0,
      msg: "ok",
      tenant_access_token: "new-token",
      expire: 7200,
    };

    global.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))
    );

    const token = await authManager.getTenantAccessToken();

    expect(token).toBe("new-token");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal");
    expect(JSON.parse(fetchCall[1].body)).toEqual({
      app_id: config.appId,
      app_secret: config.appSecret,
    });
  });

  it("should return cached token if it's still valid", async () => {
    const mockResponse = {
      code: 0,
      msg: "ok",
      tenant_access_token: "cached-token",
      expire: 7200, // 2 hours
    };

    global.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))
    );

    const startTime = 1000000;
    dateNowSpy.mockReturnValue(startTime);

    // First call to fetch token
    await authManager.getTenantAccessToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call within valid time
    dateNowSpy.mockReturnValue(startTime + 1000); // 1 second later
    const token = await authManager.getTenantAccessToken();

    expect(token).toBe("cached-token");
    expect(global.fetch).toHaveBeenCalledTimes(1); // Should not call fetch again
  });

  it("should refresh token if expired", async () => {
    const mockResponse1 = {
      code: 0,
      msg: "ok",
      tenant_access_token: "token-1",
      expire: 7200, // 2 hours
    };

    const mockResponse2 = {
      code: 0,
      msg: "ok",
      tenant_access_token: "token-2",
      expire: 7200,
    };

    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;
      const response = callCount === 1 ? mockResponse1 : mockResponse2;
      return Promise.resolve(new Response(JSON.stringify(response), { status: 200 }));
    });

    const startTime = 1000000;
    dateNowSpy.mockReturnValue(startTime);

    // First call
    await authManager.getTenantAccessToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Move time forward past expiration (7200s - 300s buffer = 6900s)
    dateNowSpy.mockReturnValue(startTime + 7000 * 1000);
    const token = await authManager.getTenantAccessToken();

    expect(token).toBe("token-2");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("should throw FeishuError if API returns non-0 code", async () => {
    const mockResponse = {
      code: 10001,
      msg: "invalid app_id",
    };

    global.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))
    );

    await expect(authManager.getTenantAccessToken()).rejects.toThrow(FeishuError);
    await expect(authManager.getTenantAccessToken()).rejects.toThrow("Feishu API Error: invalid app_id");
  });

  it("should throw Error if network request fails", async () => {
    global.fetch = mock(() => Promise.reject(new Error("Network Error")));

    await expect(authManager.getTenantAccessToken()).rejects.toThrow("Failed to refresh token: Network Error");
  });

  it("should throw FeishuError if response is not ok", async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" }))
    );

    await expect(authManager.getTenantAccessToken()).rejects.toThrow(FeishuError);
    await expect(authManager.getTenantAccessToken()).rejects.toThrow("Auth request failed: Internal Server Error");
  });

  describe("User Token (refresh_token flow)", () => {
    const userConfig = {
      appId: "test-app-id",
      appSecret: "test-app-secret",
      userAccessToken: "old-user-token",
      refreshToken: "valid-refresh-token",
    };

    let authManager: AuthManager;

    beforeEach(() => {
      authManager = new AuthManager(userConfig);
    });

    afterEach(() => {
      mock.restore();
    });

    it("should refresh user token when expired on first use", async () => {
      const mockRefreshResponse = {
        code: 0,
        msg: "ok",
        data: {
          access_token: "new-user-token",
          refresh_token: "new-refresh-token",
          token_type: "Bearer",
          expires_in: 7200,
          name: "Test User",
          en_name: "Test",
          avatar: "https://example.com/avatar.png",
          user_id: "test-user-id",
          union_id: "test-union-id",
        },
      };

      global.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockRefreshResponse), { status: 200 }))
      );

      const token = await authManager.getUserAccessToken();

      expect(token).toBe("new-user-token");
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe("https://open.feishu.cn/open-apis/authen/v1/refresh_access_token");
      const body = JSON.parse(fetchCall[1].body);
      expect(body.grant_type).toBe("refresh_token");
      expect(body.refresh_token).toBe("valid-refresh-token");
      expect(body.app_id).toBe(userConfig.appId);
      expect(body.app_secret).toBe(userConfig.appSecret);
    });

    it("should return cached user token if not expired", async () => {
      const mockRefreshResponse = {
        code: 0,
        msg: "ok",
        data: {
          access_token: "fresh-token",
          refresh_token: "new-refresh-token",
          token_type: "Bearer",
          expires_in: 7200,
          name: "Test User",
          en_name: "Test",
          avatar: "https://example.com/avatar.png",
          user_id: "test-user-id",
          union_id: "test-union-id",
        },
      };

      let callCount = 0;
      global.fetch = mock(() => {
        callCount++;
        return Promise.resolve(new Response(JSON.stringify(mockRefreshResponse), { status: 200 }));
      });

      const startTime = 1000000;
      dateNowSpy.mockReturnValue(startTime);

      // First call - should refresh (since expireTime=0 initially)
      const token1 = await authManager.getUserAccessToken();
      expect(token1).toBe("fresh-token");
      expect(callCount).toBe(1);

      // Second call within valid time (before expires_in - 300s buffer)
      // expires_in=7200s, buffer=300s, so valid for 6900s
      dateNowSpy.mockReturnValue(startTime + 1000); // 1 second later
      const token2 = await authManager.getUserAccessToken();

      expect(token2).toBe("fresh-token");
      expect(callCount).toBe(1); // Should not call fetch again
    });

    it("should throw FeishuError if refresh_token is not provided", async () => {
      // Note: AuthManager constructor requires both userAccessToken AND refreshToken
      // If either is missing, userToken is not initialized and "User access token not configured" is thrown
      const noRefreshConfig = {
        appId: "test-app-id",
        appSecret: "test-app-secret",
        userAccessToken: "some-token",
        // No refreshToken - constructor will not initialize userToken
      };

      authManager = new AuthManager(noRefreshConfig);

      await expect(authManager.getUserAccessToken()).rejects.toThrow(FeishuError);
      await expect(authManager.getUserAccessToken()).rejects.toThrow("User access token not configured");
    });

    it("should throw FeishuError if refresh API returns error", async () => {
      const mockRefreshResponse = {
        code: 99991661,
        msg: "refresh token has expired",
      };

      global.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockRefreshResponse), { status: 200 }))
      );

      await expect(authManager.getUserAccessToken()).rejects.toThrow(FeishuError);
      await expect(authManager.getUserAccessToken()).rejects.toThrow("Failed to refresh user token: refresh token has expired");
    });

    it("should not refresh if user token not configured", async () => {
      authManager = new AuthManager(config); // No user tokens

      await expect(authManager.getUserAccessToken()).rejects.toThrow(FeishuError);
      await expect(authManager.getUserAccessToken()).rejects.toThrow("User access token not configured");
    });
  });
});
