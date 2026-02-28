import { FeishuClient } from "./client";
import { ListUsersResponse, UserInfo } from "../types";
import { saveContactToCache, searchContactCache } from "./config";

export class ContactManager {
  private client: FeishuClient;

  constructor(client: FeishuClient) {
    this.client = client;
  }

  /**
   * Search users by name or email.
   * First checks cache, then falls back to API if no matches found.
   */
  async searchUser(query: string): Promise<UserInfo[]> {
    if (!query) return [];

    // 1. Try cache first
    const cachedResults = await searchContactCache(query);
    if (cachedResults.length > 0) {
      console.log(`Found ${cachedResults.length} contact(s) in cache for "${query}"`);
      return cachedResults.map(c => ({
        user_id: c.user_id,
        union_id: c.union_id,
        name: c.name,
        email: c.email,
      }));
    }

    // 2. Fall back to API
    console.log(`No cache matches for "${query}", searching Feishu API...`);

    // List users from root department with union_id
    const users = await this.listUsers("0");

    // Filter by name or email
    const lowerQuery = query.toLowerCase();
    const results = users.filter(u =>
      u.name.toLowerCase().includes(lowerQuery) ||
      (u.en_name && u.en_name.toLowerCase().includes(lowerQuery)) ||
      (u.email && u.email.toLowerCase().includes(lowerQuery))
    );

    // Cache the results (key = union_id)
    for (const user of results) {
      if (user.union_id && user.name) {
        await saveContactToCache(user.union_id, {
          name: user.name,
          email: user.email,
          user_id: user.user_id,
        });
      }
    }

    if (results.length > 0) {
      console.log(`Found ${results.length} contact(s), cached for future use.`);
    }

    return results;
  }

  /**
   * List users in a specific department
   */
  async listUsers(departmentId: string = "0", pageSize: number = 50, pageToken?: string): Promise<UserInfo[]> {
    const params: Record<string, string> = {
      department_id: departmentId,
      page_size: pageSize.toString(),
      user_id_type: "union_id", // Request union_id for calendar attendee compatibility
    };
    if (pageToken) params.page_token = pageToken;

    try {
      const res = await this.client.get<ListUsersResponse["data"]>("/open-apis/contact/v3/users", params);
      return res.items || [];
    } catch (error) {
      console.warn(`Failed to list users for department ${departmentId}:`, error);
      return [];
    }
  }
}
