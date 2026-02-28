import { Command } from "commander";
import { saveGlobalConfig, getConfigPath } from "../../core/config";
import { FeishuConfig } from "../../types";

export function createConfigCommands(program: Command) {
  program
    .command("set")
    .description("Set a config value")
    .argument("<key>", "Config key (appId or appSecret)")
    .argument("<value>", "Config value")
    .action(async (key: string, value: string) => {
      if (key !== "appId" && key !== "appSecret") {
        console.error("Error: Key must be 'appId' or 'appSecret'.");
        process.exit(1);
      }

      await saveGlobalConfig({ [key]: value });
      console.log(`Updated global config: ${key} = ${value}`);
    });

  program
    .command("get")
    .description("Get a config value")
    .argument("<key>", "Config key")
    .action(async (key: string) => {
      const file = Bun.file(getConfigPath());
      if (await file.exists()) {
        const config = await file.json();
        console.log(config[key] || "(not set)");
      } else {
        console.log("(not set)");
      }
    });

  program
    .command("list")
    .description("List all config values")
    .action(async () => {
      const f = Bun.file(getConfigPath());
      if (await f.exists()) {
        const c = await f.json();
        console.log("Global Configuration:");
        console.log(JSON.stringify(c, null, 2));
      } else {
        console.log("Global Configuration: (empty)");
      }
    });
}
