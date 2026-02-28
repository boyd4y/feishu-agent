import { FeishuClient } from "./client";
import {
  CalendarEvent,
  ListCalendarsResponse,
  ListEventsResponse,
  CreateEventResponse,
  CalendarTime,
  CalendarAttendee,
  CreateCalendarPayload,
  CreateCalendarResponse,
  FreeBusyResponse,
} from "../types";

export class CalendarManager {
  private client: FeishuClient;

  constructor(client: FeishuClient) {
    this.client = client;

    // Require user authorization for calendar operations
    if (!client.hasUserToken()) {
      throw new Error(
        "User authorization required for calendar access. " +
        "Run 'feishu-agent auth' to authorize with your Feishu account."
      );
    }
  }

  /**
   * List all calendars for the authenticated user
   * Uses user_access_token if available
   */
  async listCalendars(pageSize: number = 500, pageToken?: string): Promise<ListCalendarsResponse["data"]> {
    const params: Record<string, string> = {
      page_size: pageSize.toString(),
    };
    if (pageToken) params.page_token = pageToken;

    // Use user token if available to get user's personal calendars
    const res = await this.client.get<ListCalendarsResponse["data"]>(
      "/open-apis/calendar/v4/calendars",
      params,
      true // useUserToken = true
    );
    return res;
  }

  /**
   * Get the primary calendar for the authenticated user
   */
  async getPrimaryCalendar(): Promise<string> {
    const calendars = await this.listCalendars();
    const primary = calendars.calendar_list.find((c) => c.type === "primary");

    if (primary) return primary.calendar_id;
    throw new Error("Primary calendar not found");
  }

  /**
   * List events for a specific calendar
   */
  async listEvents(
    calendarId: string,
    options?: {
      pageSize?: number;
      pageToken?: string;
      startTime?: string;
      endTime?: string;
    }
  ): Promise<ListEventsResponse["data"]> {
    const params: Record<string, string> = {
      page_size: (options?.pageSize || 500).toString(),
    };

    if (options?.pageToken) params.page_token = options.pageToken;
    if (options?.startTime) params.start_time = options.startTime;
    if (options?.endTime) params.end_time = options.endTime;

    const res = await this.client.get<ListEventsResponse["data"]>(
      `/open-apis/calendar/v4/calendars/${calendarId}/events`,
      params,
      true // useUserToken = true
    );
    return res;
  }

  /**
   * Get attendees for a specific event
   */
  async getEventAttendees(calendarId: string, eventId: string): Promise<CalendarAttendee[]> {
    const res = await this.client.get<{ items: CalendarAttendee[] }>(
      `/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}/attendees`,
      {},
      true // useUserToken = true
    );
    return res.items || [];
  }

  /**
   * Get details of a specific event
   */
  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    const res = await this.client.get<{ event: CalendarEvent }>(
      `/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`,
      { user_id_type: "union_id" },
      true // useUserToken = true
    );
    return res.event;
  }

  /**
   * List attendees of a specific event
   */
  async listEventAttendees(
    calendarId: string,
    eventId: string,
    options?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<{ items: CalendarAttendee[]; page_token: string; has_more: boolean }> {
    const params: Record<string, string> = {
      page_size: (options?.pageSize || 50).toString(),
    };
    if (options?.pageToken) params.page_token = options.pageToken;

    const res = await this.client.get<{ items: CalendarAttendee[]; page_token: string; has_more: boolean }>(
      `/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}/attendees`,
      params,
      true // useUserToken = true
    );
    return res;
  }

  /**
   * Create a new event
   */
  async createEvent(
    calendarId: string,
    event: {
      summary: string;
      description?: string;
      startTime: CalendarTime;
      endTime: CalendarTime;
      attendeeOpenIds?: string[]; // open_ids for attendees API
      checkConflict?: boolean; // Whether to check for time conflicts
    }
  ): Promise<CalendarEvent> {
    // Step 1: Check for time conflicts if requested
    if (event.checkConflict !== false) {
      await this.checkTimeConflict(event.startTime, event.endTime);
    }

    // Step 2: Create the event
    const body: Record<string, any> = {
      summary: event.summary,
      description: event.description,
      start_time: event.startTime,
      end_time: event.endTime,
    };

    const res = await this.client.post<CreateEventResponse["data"]>(
      `/open-apis/calendar/v4/calendars/${calendarId}/events`,
      body,
      { user_id_type: "union_id" },
      true
    );

    const createdEvent = res.event;

    // Step 3: Add attendees if specified
    if (event.attendeeOpenIds && event.attendeeOpenIds.length > 0) {
      await this.client.post(
        `/open-apis/calendar/v4/calendars/${calendarId}/events/${createdEvent.event_id}/attendees`,
        {
          attendees: event.attendeeOpenIds.map(id => ({
            type: "user",
            user_id: id,
          })),
        },
        {}
      );
    }

    return createdEvent;
  }

  /**
   * Delete an event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.client.request(
      `/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`,
      { method: "DELETE" },
      true // useUserToken = true
    );
  }

  /**
   * Create a secondary calendar
   */
  async createCalendar(payload: CreateCalendarPayload): Promise<string> {
    const res = await this.client.post<CreateCalendarResponse["data"]>(
      "/open-apis/calendar/v4/calendars",
      payload,
      undefined,
      true // useUserToken = true
    );
    return res.calendar.calendar_id;
  }

  /**
   * Get free/busy information for a user
   */
  async getUserFreeBusy(userId: string, timeMin: string, timeMax: string): Promise<FreeBusyResponse["data"]> {
    const body = {
      time_min: timeMin,
      time_max: timeMax,
      user_id: userId
    };

    // Assume union_id (starts with on_) or user_id, default to union_id
    let userIdType = "union_id";
    if (userId.startsWith("on_")) userIdType = "union_id";

    const res = await this.client.post<FreeBusyResponse["data"]>(
      "/open-apis/calendar/v4/freebusy/list",
      body,
      { user_id_type: userIdType },
      true // useUserToken = true
    );
    return res;
  }

  /**
   * Check if there is a time conflict for the current user
   */
  private async checkTimeConflict(
    startTime: CalendarTime,
    endTime: CalendarTime
  ): Promise<void> {
    // Get current user ID from token
    const currentUser = await this.client.getCurrentUser();
    if (!currentUser?.user_id) {
      // If we can't get user info, skip conflict check
      return;
    }

    // Convert timestamp to RFC3339 format if needed
    const timeMin = this.toRFC3339(startTime);
    const timeMax = this.toRFC3339(endTime);

    // Use union_id for freebusy API (same as user_id from authen API)
    const freeBusy = await this.getUserFreeBusy(currentUser.user_id, timeMin, timeMax);

    // Check if there are any busy slots
    if (freeBusy.freebusy_list && freeBusy.freebusy_list.length > 0) {
      const conflicts = freeBusy.freebusy_list.map(
        (slot) => `${new Date(slot.start_time).toLocaleString()} - ${new Date(slot.end_time).toLocaleString()}`
      );
      throw new Error(
        `Time conflict detected. The following time slots are already busy:\n` +
        `  ${conflicts.join("\n  ")}`
      );
    }
  }

  /**
   * Convert CalendarTime to RFC3339 format
   */
  private toRFC3339(time: CalendarTime): string {
    if (time.timestamp) {
      const date = new Date(parseInt(time.timestamp) * 1000);
      return date.toISOString();
    }
    if (time.date) {
      return time.date;
    }
    return new Date().toISOString();
  }

  /**
   * Update an event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: {
      summary?: string;
      description?: string;
      startTime?: CalendarTime;
      endTime?: CalendarTime;
      attendees?: CalendarAttendee[];
    }
  ): Promise<CalendarEvent> {
    const body: Record<string, any> = {};
    if (updates.summary !== undefined) body.summary = updates.summary;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.startTime !== undefined) body.start_time = updates.startTime;
    if (updates.endTime !== undefined) body.end_time = updates.endTime;
    if (updates.attendees !== undefined) body.attendees = updates.attendees;

    const res = await this.client.post<CreateEventResponse["data"]>(
      `/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`,
      body,
      undefined,
      true // useUserToken = true
    );
    return res.event;
  }

  /**
   * Share a calendar with a user
   */
  async shareCalendarWithUser(
    calendarId: string,
    userId: string,
    role: "reader" | "writer" | "free_busy_reader" = "reader"
  ): Promise<void> {
    throw new Error(
      "Calendar sharing requires user authorization. " +
      "Please share the calendar manually in Feishu app."
    );
  }

  /**
   * Get calendar share link
   */
  getCalendarShareLink(calendarId: string): string {
    return `https://applink.feishu.cn/client/calendar/?calendarId=${encodeURIComponent(calendarId)}`;
  }

}
