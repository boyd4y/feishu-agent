#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { initCommand } from "./commands/init";
import { configCommand } from "./commands/config";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: false,
    options: {
      "app-id": { type: "string" },
      "app-secret": { type: "string" },
    },
  });

  const command = positionals[0];

  switch (command) {
    case "init":
      // Pass the parsed options to the init command (requires refactor)
      // For now, we will update initCommand signature or inject into process.env or similar?
      // Better: Update initCommand to accept options.
      await initCommand(positionals.slice(1), {
          appId: values["app-id"],
          appSecret: values["app-secret"],
      });
      break;
    case "config":
      await configCommand(positionals.slice(1));
      break;
    default:
      console.log("Usage: feishu-agent <command> [args]");
      console.log("Options:");
      console.log("  --app-id <id>       Feishu App ID");
      console.log("  --app-secret <key>  Feishu App Secret");
      console.log("Commands:");
      console.log("  init <url|path>     Initialize schema from Feishu Base URL");
      console.log("  config <subcmd>     Manage global configuration");
      break;
  }
}


main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
