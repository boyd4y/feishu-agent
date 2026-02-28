export interface FeishuConfig {
  appId: string;
  appSecret: string;
  baseUrl?: string;
  userAccessToken?: string;  // Optional: for OAuth 2.0 user authorization
}

export interface TenantAccessTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

export interface FeishuErrorResponse {
  code: number;
  msg: string;
  error?: any;
}

export class FeishuError extends Error {
  code: number;
  rawResponse?: any;
  constructor(message: string, code: number, rawResponse?: any) {
    super(message);
    this.code = code;
    this.rawResponse = rawResponse;
    this.name = "FeishuError";
  }
}

export interface FeishuBase {
  app_token: string;
  name: string;
  revision: number;
}

export interface FeishuTable {
  table_id: string;
  revision: number;
  name: string;
}

export interface FeishuField {
  field_id: string;
  field_name: string;
  type: number;
  property?: any;
}

export interface ListTablesResponse {
  code: number;
  msg: string;
  data: {
    items: FeishuTable[];
    page_token: string;
    has_more: boolean;
    total: number;
  };
}

export interface ListFieldsResponse {
  code: number;
  msg: string;
  data: {
    items: FeishuField[];
    page_token: string;
    has_more: boolean;
    total: number;
  };
}

export interface CalendarTime {
  timestamp?: string; // Seconds as string
  date?: string; // YYYY-MM-DD
  timezone?: string;
}

export interface CalendarEvent {
  event_id?: string;
  summary: string;
  description?: string;
  start_time: CalendarTime;
  end_time: CalendarTime;
  calendar_id?: string;
  attendees?: CalendarAttendee[];
}

export interface ListCalendarsResponse {
  code: number;
  msg: string;
  data: {
    calendar_list: Array<{
      calendar_id: string;
      summary: string;
      description: string;
      type: "primary" | "shared" | "google" | "resource" | "exchange";
      role: "owner" | "writer" | "reader" | "free_busy_reader";
    }>;
    page_token: string;
    sync_token: string;
    has_more: boolean;
  };
}

export interface ListEventsResponse {
  code: number;
  msg: string;
  data: {
    items: CalendarEvent[];
    page_token: string;
    sync_token: string;
    has_more: boolean;
  };
}

export interface CreateEventResponse {
  code: number;
  msg: string;
  data: {
    event: CalendarEvent;
  };
}

export interface CalendarAttendee {
  type: "user" | "chat" | "resource" | "third_party";
  is_optional?: boolean;
  user_id?: string;
  chat_id?: string;
  resource_id?: string;
  third_party_email?: string;
}

export interface CreateCalendarPayload {
  summary?: string;
  description?: string;
  permissions?: "private" | "show_only_free_busy" | "public";
  color?: number;
  summary_alias?: string;
}

export interface FreeBusyPayload {
  time_min: string; // RFC3339
  time_max: string; // RFC3339
  user_id?: string;
  room_id?: string;
  include_external?: boolean;
}

export interface FreeBusyItem {
  start_time: string;
  end_time: string;
}

export interface FreeBusyResponse {
  code: number;
  msg: string;
  data: {
    freebusy_list: Array<{
      start_time: string;
      end_time: string;
    }>;
  };
}

export interface UserInfo {
  user_id: string;
  union_id: string;
  name: string;
  en_name?: string;
  email?: string;
  mobile?: string;
}

export interface ListUsersResponse {
  code: number;
  msg: string;
  data: {
    has_more: boolean;
    page_token: string;
    items: UserInfo[];
  };
}

export interface CreateCalendarResponse {
  code: number;
  msg: string;
  data: {
    calendar: {
      calendar_id: string;
      summary: string;
      description: string;
      permissions: string;
      type: string;
      role: string;
    };
  };
}
