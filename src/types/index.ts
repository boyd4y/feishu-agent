export interface FeishuConfig {
  appId: string;
  appSecret: string;
  baseUrl?: string;
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
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
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