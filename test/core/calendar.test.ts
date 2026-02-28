import { describe, it, expect, beforeEach, mock } from "bun:test";
import { FeishuClient } from "../../src/core/client";
import { CalendarManager } from "../../src/core/calendar";

describe("CalendarManager", () => {
  let client: FeishuClient;
  let calendarManager: CalendarManager;

  beforeEach(() => {
    client = new FeishuClient({
      appId: "test",
      appSecret: "test",
      userAccessToken: "test_user_token",
      refreshToken: "test_refresh_token",
    });
    calendarManager = new CalendarManager(client);
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
      // Mock user token refresh response
      if (url.toString().includes("refresh_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            access_token: "new_user_token",
            refresh_token: "new_refresh_token",
            token_type: "Bearer",
            expires_in: 7200,
            name: "Test User",
            user_id: "test_user_id",
            union_id: "test_union_id",
          }
        })));
      }
      // Mock user info endpoint (for getCurrentUser)
      if (url.toString().includes("authen/v1/user_info")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            user_id: "test_user_id",
            name: "Test User",
          }
        })));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });
  });

  it("should list calendars", async () => {
    const mockResponse = {
      code: 0,
      msg: "success",
      data: {
        calendar_list: [
          {
            calendar_id: "calendar_1",
            summary: "Primary Calendar",
            type: "primary",
          },
        ],
        has_more: false,
      },
    };

    // Override mock for this test
    global.fetch = mock((url, options) => {
      if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      // Mock user token refresh response
      if (url.toString().includes("refresh_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            access_token: "new_user_token",
            refresh_token: "new_refresh_token",
            token_type: "Bearer",
            expires_in: 7200,
            name: "Test User",
            user_id: "test_user_id",
            union_id: "test_union_id",
          }
        })));
      }
      if (url.toString().includes("/calendars")) {
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });


    const result = await calendarManager.listCalendars();
    expect(result.calendar_list).toHaveLength(1);
    expect(result.calendar_list[0].calendar_id).toBe("calendar_1");
  });

  it("should get primary calendar", async () => {
    const mockResponse = {
      code: 0,
      msg: "success",
      data: {
        calendar_list: [
          {
            calendar_id: "calendar_primary",
            type: "primary",
          },
          {
            calendar_id: "calendar_secondary",
            type: "shared",
          },
        ],
      },
    };

    global.fetch = mock((url, options) => {
      if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      // Mock user token refresh response
      if (url.toString().includes("refresh_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            access_token: "new_user_token",
            refresh_token: "new_refresh_token",
            token_type: "Bearer",
            expires_in: 7200,
            name: "Test User",
            user_id: "test_user_id",
            union_id: "test_union_id",
          }
        })));
      }
      if (url.toString().includes("/calendars")) {
         return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });

    const primaryId = await calendarManager.getPrimaryCalendar();
    expect(primaryId).toBe("calendar_primary");
  });

  it("should create event", async () => {
    const eventData = {
      summary: "Test Event",
      startTime: { timestamp: "1600000000" },
      endTime: { timestamp: "1600003600" },
    };

    const mockResponse = {
      code: 0,
      msg: "success",
      data: {
        event: {
          event_id: "event_1",
          ...eventData,
        },
      },
    };

    global.fetch = mock((url, options) => {
      if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      // Mock user token refresh response
      if (url.toString().includes("refresh_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            access_token: "new_user_token",
            refresh_token: "new_refresh_token",
            token_type: "Bearer",
            expires_in: 7200,
            name: "Test User",
            user_id: "test_user_id",
            union_id: "test_union_id",
          }
        })));
      }
      if (url.toString().includes("/events")) {
          return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });

    const result = await calendarManager.createEvent("calendar_1", eventData);
    expect(result.event_id).toBe("event_1");
    expect(result.summary).toBe("Test Event");
  });

  it("should delete event", async () => {
    const mockFetch = mock((url) => {
       if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      // Mock user token refresh response
      if (url.toString().includes("refresh_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            access_token: "new_user_token",
            refresh_token: "new_refresh_token",
            token_type: "Bearer",
            expires_in: 7200,
            name: "Test User",
            user_id: "test_user_id",
            union_id: "test_union_id",
          }
        })));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });
    global.fetch = mockFetch;

    await calendarManager.deleteEvent("calendar_1", "event_1");
    
    // Verify DELETE was called
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/events/event_1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("should get user free busy", async () => {
    const mockResponse = {
      code: 0,
      msg: "success",
      data: {
        free_busy_list: [
          {
            calendar_id: "calendar_1",
            free_busy: [
              {
                start_time: "2023-10-27T10:00:00Z",
                end_time: "2023-10-27T11:00:00Z"
              }
            ]
          }
        ]
      }
    };

    global.fetch = mock((url, options) => {
      if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      // Mock user token refresh response
      if (url.toString().includes("refresh_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            access_token: "new_user_token",
            refresh_token: "new_refresh_token",
            token_type: "Bearer",
            expires_in: 7200,
            name: "Test User",
            user_id: "test_user_id",
            union_id: "test_union_id",
          }
        })));
      }
      if (url.toString().includes("/freebusy/list")) {
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });

    const result = await calendarManager.getUserFreeBusy("user_1", "2023-10-27T00:00:00Z", "2023-10-27T23:59:59Z");
    expect(result.free_busy_list).toHaveLength(1);
    expect(result.free_busy_list[0].calendar_id).toBe("calendar_1");
    expect(result.free_busy_list[0].free_busy).toHaveLength(1);
  });

  it("should throw error when time conflict detected", async () => {
    const eventData = {
      summary: "Test Event",
      startTime: { timestamp: "1696644000" }, // 2023-10-07 10:00:00 UTC
      endTime: { timestamp: "1696647600" },   // 2023-10-07 11:00:00 UTC
    };

    // Mock freebusy shows conflict
    global.fetch = mock((url) => {
      if (url.toString().includes("tenant_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          tenant_access_token: "mock_token",
          expire: 7200
        })));
      }
      if (url.toString().includes("refresh_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            access_token: "new_user_token",
            refresh_token: "new_refresh_token",
            token_type: "Bearer",
            expires_in: 7200,
            name: "Test User",
            user_id: "test_user_id",
            union_id: "test_union_id",
          }
        })));
      }
      if (url.toString().includes("authen/v1/user_info")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            user_id: "test_user_id",
            name: "Test User",
          }
        })));
      }
      if (url.toString().includes("/freebusy/list")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            freebusy_list: [{
              start_time: "2023-10-07T09:00:00Z",
              end_time: "2023-10-07T12:00:00Z",
            }]
          }
        })));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });

    await expect(calendarManager.createEvent("calendar_1", eventData)).rejects.toThrow("Time conflict detected");
  });

  it("should create event when checkConflict is false", async () => {
    const eventData = {
      summary: "Test Event",
      startTime: { timestamp: "1600000000" },
      endTime: { timestamp: "1600003600" },
      checkConflict: false,
    };

    const mockResponse = {
      code: 0,
      msg: "success",
      data: {
        event: {
          event_id: "event_1",
          ...eventData,
        },
      },
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
      if (url.toString().includes("refresh_access_token")) {
        return Promise.resolve(new Response(JSON.stringify({
          code: 0,
          msg: "success",
          data: {
            access_token: "new_user_token",
            refresh_token: "new_refresh_token",
            token_type: "Bearer",
            expires_in: 7200,
            name: "Test User",
            user_id: "test_user_id",
            union_id: "test_union_id",
          }
        })));
      }
      if (url.toString().includes("/events")) {
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      }
      return Promise.resolve(new Response(JSON.stringify({ code: 0, msg: "success" })));
    });

    const result = await calendarManager.createEvent("calendar_1", eventData);
    expect(result.event_id).toBe("event_1");
  });
});
