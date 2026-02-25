import { parseArgs } from "node:util";
import { saveGlobalConfig, getConfigPaths, FeishuConfig } from "../../core/config";

export async function configCommand(args: string[]) {
  const command = args[0];
  const key = args[1];
  const value = args[2];

  if (!command) {
    console.log("Usage: feishu-agent config <set|get|list> [key] [value]");
    return;
  }

  switch (command) {
    case "set":
      if (!key || !value) {
        console.error("Error: Please provide a key and value.");
        console.error("Example: feishu-agent config set appId cli_a1b2c3d4");
        process.exit(1);
      }
      if (key !== "appId" && key !== "appSecret") {
         console.error("Error: Key must be 'appId' or 'appSecret'.");
         process.exit(1);
      }

      await saveGlobalConfig({ [key]: value });
      console.log(`Updated global config: ${key} = ${value}`);
      break;

    case "get":
      if (!key) {
        console.error("Error: Please provide a key.");
        process.exit(1);
      }
      const file = Bun.file(getConfigPaths());
      if (await file.exists()) {
        const config = await file.json();
        console.log(config[key] || "(not set)");
      } else {
        console.log("(not set)");
      }
      break;

    case "list":
      const f = Bun.file(getConfigPaths());
      if (await f.exists()) {
        const c = await f.json();
        console.log("Global Configuration:");
        console.log(JSON.stringify(c, null, 2));
      } else {
        console.log("Global Configuration: (empty)");
      }
      break;

    default:
      console.error(`Unknown config command: ${command}`);
      process.exit(1);
  }
}
