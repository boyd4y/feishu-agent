import { FeishuClient } from "./client";

export interface TodoItem {
  record_id: string;
  fields: {
    Title: string;
    Done: boolean;
    Priority?: "High" | "Medium" | "Low";
    [key: string]: any;
  };
}

export class TodoManager {
  private client: FeishuClient;
  private appToken: string;
  private tableId?: string;

  constructor(client: FeishuClient, appToken: string) {
    this.client = client;
    this.appToken = appToken;
  }

  /**
   * Find a table by name, or return the first table if no name provided.
   */
  async findTable(tableName: string = "Todo"): Promise<string> {
    if (this.tableId) return this.tableId;

    let pageToken = "";
    let hasMore = true;

    while (hasMore) {
      const res: any = await this.client.get(`/open-apis/bitable/v1/apps/${this.appToken}/tables`, {
        page_token: pageToken,
        page_size: "100"
      });
      
      const tables = res.data.items || [];
      const target = tables.find((t: any) => t.name === tableName);
      
      if (target) {
        this.tableId = target.table_id;
        return target.table_id;
      }

      hasMore = res.data.has_more;
      pageToken = res.data.page_token;
    }

    throw new Error(`Table "${tableName}" not found in Base ${this.appToken}`);
  }

  async listTodos(viewId?: string): Promise<TodoItem[]> {
    const tableId = await this.findTable();
    const params: Record<string, string> = { page_size: "100" };
    if (viewId) params.view_id = viewId;

    // Filter by formula could be added here if needed
    // params.filter = 'CurrentValue.[Done]=FALSE()'; 

    const res: any = await this.client.get(
      `/open-apis/bitable/v1/apps/${this.appToken}/tables/${tableId}/records`, 
      params
    );

    return (res.data.items || []).map((item: any) => ({
      record_id: item.record_id,
      fields: item.fields
    }));
  }

  async createTodo(title: string, priority: string = "Medium"): Promise<TodoItem> {
    const tableId = await this.findTable();
    const body = {
      fields: {
        "Title": title,
        "Done": false,
        "Priority": priority
      }
    };

    const res: any = await this.client.post(
      `/open-apis/bitable/v1/apps/${this.appToken}/tables/${tableId}/records`,
      body
    );

    return {
      record_id: res.data.record.record_id,
      fields: res.data.record.fields
    };
  }

  async markDone(recordId: string): Promise<void> {
    const tableId = await this.findTable();
    const body = {
      fields: {
        "Done": true
      }
    };
    
    await this.client.request(
        `/open-apis/bitable/v1/apps/${this.appToken}/tables/${tableId}/records/${recordId}`,
        {
            method: "PUT",
            body: JSON.stringify(body)
        }
    );
  }
}
