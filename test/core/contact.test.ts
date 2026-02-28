import { describe, it, expect, beforeEach, mock } from "bun:test";
import { FeishuClient } from "../../src/core/client";
import { ContactManager } from "../../src/core/contact";

describe("ContactManager", () => {
  let client: FeishuClient;
  let contactManager: ContactManager;

  beforeEach(() => {
    client = new FeishuClient({ appId: "test", appSecret: "test" });
    contactManager = new ContactManager(client);
    // Mock global fetch
    global.fetch = mock((url) => {
      // Mock auth token response
      if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });
  });

  it("should list users in department", async () => {
    const mockResponse = {
      code: 0,
      msg: "success",
      data: {
        items: [
          {
            user_id: "user_1",
            name: "Alice",
            email: "alice@example.com"
          },
          {
            user_id: "user_2",
            name: "Bob",
            email: "bob@example.com"
          }
        ],
        has_more: false
      }
    };

    global.fetch = mock((url) => {
      if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      if (url.toString().includes("/contact/v3/users")) {
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });

    const result = await contactManager.listUsers("0");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[1].name).toBe("Bob");
  });

  it("should search users by name", async () => {
    const mockResponse = {
      code: 0,
      msg: "success",
      data: {
        items: [
          {
            user_id: "user_1",
            name: "Alice",
            email: "alice@example.com"
          },
          {
            user_id: "user_2",
            name: "Bob",
            email: "bob@example.com"
          }
        ],
        has_more: false
      }
    };

    global.fetch = mock((url) => {
      if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      if (url.toString().includes("/contact/v3/users")) {
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });

    const result = await contactManager.searchUser("Alice");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("should search users by email", async () => {
    const mockResponse = {
      code: 0,
      msg: "success",
      data: {
        items: [
          {
            user_id: "user_1",
            name: "Alice",
            email: "alice@example.com"
          },
          {
            user_id: "user_2",
            name: "Bob",
            email: "bob@example.com"
          }
        ],
        has_more: false
      }
    };

    global.fetch = mock((url) => {
      if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      if (url.toString().includes("/contact/v3/users")) {
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });

    const result = await contactManager.searchUser("bob@example.com");
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("bob@example.com");
  });
});
