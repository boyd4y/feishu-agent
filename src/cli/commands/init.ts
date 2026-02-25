import { loadConfig, FeishuConfig } from "../../core/config";
import { FeishuClient } from "../../core/client";
import { IntrospectionEngine } from "../../core/introspection";
import { writeFile, mkdir } from "fs/promises";

export async function initCommand(args: string[], cliOptions?: Partial<FeishuConfig>) {
  const target = args[0];

  // If no target provided, go straight to interactive mode
  if (!target) {
    await initInteractive(undefined, cliOptions);
    return;
  }

  // Check if it's a Folder URL
  if (target.includes("/drive/folder/")) {
    console.warn("That looks like a Folder URL. Please provide a Base URL (多维表格).");
    await initInteractive(undefined, cliOptions);
    return;
  }

  const baseToken = extractBaseToken(target);
  if (baseToken) {
    await initInteractive(target, cliOptions);
  } else {
    // Treat as local path (scaffolding) - for now just log
    console.log(`Initializing in local path: ${target}`);
    // TODO: Implement local scaffolding logic if needed
  }
}

async function initInteractive(initialTarget?: string, cliOptions?: Partial<FeishuConfig>) {
  let baseToken: string | null = null;

  if (initialTarget) {
    baseToken = extractBaseToken(initialTarget);
  }

  while (!baseToken) {
    const input = prompt("Please enter the Feishu Base URL (or Base Token): ");
    
    if (!input) {
      console.error("Error: Base Token is required.");
      process.exit(1);
    }

    baseToken = extractBaseToken(input);

    if (!baseToken) {
      console.error("Invalid input. Could not extract Base Token.");
      console.log("To find your Base URL: Open the Base (多维表格) in your browser and copy the link. It usually looks like: https://.../base/basexxxxxx");
    }
  }

  console.log(`Detected Base Token: ${baseToken}`);
  await runIntrospection(baseToken, cliOptions);
}

async function runIntrospection(baseToken: string, cliOptions?: Partial<FeishuConfig>) {
  // Load configuration
  const config = await loadConfig(cliOptions);

  // Get App Credentials
  let appId = config.appId;
  if (!appId) {
    const input = prompt("Enter Feishu App ID:");
    if (!input) {
      console.error("Error: App ID is required.");
      process.exit(1);
    }
    appId = input;
  }

  let appSecret = config.appSecret;
  if (!appSecret) {
    const input = prompt("Enter Feishu App Secret:");
    if (!input) {
      console.error("Error: App Secret is required.");
      process.exit(1);
    }
    appSecret = input;
  }

  console.log("Fetching schema...");
  
  const client = new FeishuClient({
    appId,
    appSecret,
  });

  try {
    const engine = new IntrospectionEngine(client);
    const schema = await engine.introspect(baseToken, (msg) => console.log(msg));

    await mkdir(".feishu_agent", { recursive: true });
    await writeFile(".feishu_agent/schema.json", JSON.stringify(schema, null, 2));
    console.log("Success! Schema saved to .feishu_agent/schema.json");

    // Create .env if it doesn't exist
    const envFile = Bun.file(".env");
    if (!(await envFile.exists())) {
        const envContent = `FEISHU_APP_ID=${appId}\nFEISHU_APP_SECRET=${appSecret}\n`;
        await writeFile(".env", envContent);
        console.log("Created .env file with credentials.");
    } else {
        console.log(".env file already exists, skipping creation.");
    }

  } catch (error) {
    console.error("Failed to fetch schema:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function extractBaseToken(input: string): string | null {
  // 1. Try to match URL pattern: .../base/<token>...
  const urlMatch = input.match(/\/base\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // 2. check if input itself looks like a token (starts with 'base' or 'app')
  if (/^(base|app)[a-zA-Z0-9]+$/.test(input)) {
    return input;
  }

  return null;
}
