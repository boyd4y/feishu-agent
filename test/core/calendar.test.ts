import { describe, it, expect, beforeEach, mock } from "bun:test";
import { FeishuClient } from "../../src/core/client";
import { CalendarManager } from "../../src/core/calendar";

describe("CalendarManager", () => {
  let client: FeishuClient;
  let calendarManager: CalendarManager;

  beforeEach(() => {
    client = new FeishuClient({ appId: "test", appSecret: "test", userAccessToken: "test_user_token" });
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
});
