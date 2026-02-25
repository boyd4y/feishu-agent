import { FeishuClient } from "./client";
import { ListTablesResponse, ListFieldsResponse, FeishuTable, FeishuField } from "../types";

export interface Schema {
  baseToken: string;
  tables: TableSchema[];
}

export interface TableSchema {
  id: string;
  name: string;
  fields: FeishuField[];
}

export class IntrospectionEngine {
  private client: FeishuClient;

  constructor(client: FeishuClient) {
    this.client = client;
  }

  async introspect(baseToken: string, onProgress?: (msg: string) => void): Promise<Schema> {
    const tables = await this.listTables(baseToken, onProgress);
    
    const tableSchemas: TableSchema[] = await Promise.all(
      tables.map(async (table) => {
        onProgress?.(`Fetching fields for table ${table.name} (${table.table_id})...`);
        const fields = await this.listFields(baseToken, table.table_id);
        return {
          id: table.table_id,
          name: table.name,
          fields,
        };
      })
    );

    return {
      baseToken,
      tables: tableSchemas,
    };
  }

  private async listTables(baseToken: string, onProgress?: (msg: string) => void): Promise<FeishuTable[]> {
    onProgress?.("Fetching tables list...");
    let hasMore = true;
    let pageToken = "";
    const allTables: FeishuTable[] = [];

    while (hasMore) {
      const query: Record<string, string> = {};
      if (pageToken) query.page_token = pageToken;

      const data = await this.client.get<ListTablesResponse["data"]>(
        `/open-apis/bitable/v1/apps/${baseToken}/tables`,
        query
      );

      if (data.items) {
        allTables.push(...data.items);
      }

      if (hasMore && !data.page_token) {
         break; // Safety break
      }

      hasMore = data.has_more;
      pageToken = data.page_token;
    }

    onProgress?.(`Found ${allTables.length} tables.`);
    return allTables;
  }

  private async listFields(baseToken: string, tableId: string): Promise<FeishuField[]> {
    let hasMore = true;
    let pageToken = "";
    const allFields: FeishuField[] = [];

    while (hasMore) {
      const query: Record<string, string> = {};
      if (pageToken) query.page_token = pageToken;

      const data = await this.client.get<ListFieldsResponse["data"]>(
        `/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/fields`,
        query
      );

      if (data.items) {
        allFields.push(...data.items);
      }

      if (hasMore && !data.page_token) {
         break; // Safety break
      }

      hasMore = data.has_more;
      pageToken = data.page_token;
    }

    return allFields;
  }

}