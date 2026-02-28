#!/usr/bin/env bun
import { FeishuClient } from "../../core/client";
import { loadConfig } from "../../core/config";

export async function whoamiCommand() {
  console.log("\n=== Feishu Agent - Who Am I ===\n");

  const config = await loadConfig();

  if (!config.appId || !config.appSecret) {
    console.error("Error: App credentials not configured.");
    console.error("Run 'feishu-agent setup' to configure credentials.");
    process.exit(1);
  }

  const client = new FeishuClient({
    appId: config.appId,
    appSecret: config.appSecret,
    userAccessToken: config.userAccessToken,
  });

  // Check if user has authorized
  if (!client.hasUserToken()) {
    console.log("App credentials:");
    console.log(`  App ID:     ${config.appId}`);
    console.log("");
    console.log("User authorization: NOT CONFIGURED");
    console.log("");
    console.log("Run 'feishu-agent auth' to authorize with your Feishu account.");
    console.log("This is required for calendar and other user-level operations.");
    return;
  }

  // Get user info
  try {
    const user = await client.getCurrentUser();

    if (user) {
      console.log("App credentials:");
      console.log(`  App ID:     ${config.appId}`);
      console.log("");
      console.log("User authorization: CONFIGURED");
      console.log("");
      console.log("Current user:");
      console.log(`  Name:       ${user.name}`);
      console.log(`  User ID:    ${user.user_id}`);
      console.log("");
      console.log("You can use calendar and other user-level commands.");
    } else {
      console.log("App credentials: CONFIGURED");
      console.log("User authorization: CONFIGURED (but unable to fetch user info)");
      console.log("");
      console.log("Note: Token might be expired. Run 'feishu-agent auth' to re-authorize.");
    }
  } catch (error) {
    console.log("App credentials: CONFIGURED");
    console.log("User authorization: CONFIGURED (but verification failed)");
    console.log("");
    console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log("");
    console.log("Try running 'feishu-agent auth' to re-authorize.");
  }
}
