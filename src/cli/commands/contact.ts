import { Command } from "commander";
import { FeishuClient } from "../../core/client";
import { ContactManager } from "../../core/contact";
import { FeishuConfig } from "../../types";

interface ContactOptions {
  dept?: string;
}

export function createContactCommands(program: Command, config: FeishuConfig) {
  program
    .command("list")
    .description("List users in a department")
    .option("--dept <string>", "Department ID", "0")
    .action(async (options: ContactOptions) => {
      await handleList(config, options.dept);
    });

  program
    .command("search")
    .description("Search users by name or email")
    .argument("<query>", "Search query")
    .action(async (query: string) => {
      await handleSearch(config, query);
    });
}

async function handleList(config: FeishuConfig, dept: string = "0") {
  if (!config.appId || !config.appSecret) {
    console.error("Error: Credentials required.");
    process.exit(1);
  }

  const client = new FeishuClient(config);
  const contactManager = new ContactManager(client);

  console.log(`Fetching users for department: ${dept}`);
  const users = await contactManager.listUsers(dept);

  if (users.length > 0) {
    users.forEach((u) => {
      console.log(`- Name: ${u.name}${u.email ? ` (${u.email})` : ''}`);
      if (u.user_id && u.union_id && u.user_id !== u.union_id) {
        console.log(`  ID: ${u.user_id} / UnionID: ${u.union_id}`);
      } else if (u.user_id) {
        console.log(`  ID: ${u.user_id}`);
      } else if (u.union_id) {
        console.log(`  UnionID: ${u.union_id}`);
      }
      console.log("");
    });
    console.log(`Total: ${users.length} users`);
  } else {
    console.log("No users found.");
  }
}

async function handleSearch(config: FeishuConfig, query: string) {
  if (!config.appId || !config.appSecret) {
    console.error("Error: Credentials required.");
    process.exit(1);
  }

  if (!query) {
    console.error("Error: search query is required.");
    process.exit(1);
  }

  const client = new FeishuClient(config);
  const contactManager = new ContactManager(client);

  console.log(`Searching for users matching: '${query}'`);
  const users = await contactManager.searchUser(query);

  if (users.length > 0) {
    users.forEach((u) => {
      console.log(`- Name: ${u.name}${u.email ? ` (${u.email})` : ''}`);
      if (u.user_id && u.union_id && u.user_id !== u.union_id) {
        console.log(`  ID: ${u.user_id} / UnionID: ${u.union_id}`);
      } else if (u.user_id) {
        console.log(`  ID: ${u.user_id}`);
      } else if (u.union_id) {
        console.log(`  UnionID: ${u.union_id}`);
      }
    });
    console.log(`Total: ${users.length} matching users`);
  } else {
    console.log("No matching users found.");
  }
}
