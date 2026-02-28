#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { exec } from "node:child_process";
import { writeFile } from "fs/promises";
import { loadConfig, saveGlobalConfig } from "../../core/config";
import { FeishuClient } from "../../core/client";
import { IntrospectionEngine } from "../../core/introspection";

interface UserAccessTokenResponse {
  code: number;
  msg: string;
  data?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    name: string;
    en_name: string;
    avatar: string;
    user_id: string;
    union_id: string;
  };
}

export async function setupCommand() {
  console.log("\n========================================");
  console.log("  Feishu Agent Setup");
  console.log("========================================\n");

  // Step 1: Get App ID and Secret
  console.log("Step 1: Feishu App Credentials");
  console.log("-".repeat(40));

  let config = await loadConfig();
  let appId = config.appId;
  let appSecret = config.appSecret;

  if (!appId) {
    const input = prompt("Enter Feishu App ID:");
    if (!input) {
      console.error("Error: App ID is required.");
      process.exit(1);
    }
    appId = input;
  }

  if (!appSecret) {
    const input = prompt("Enter Feishu App Secret:");
    if (!input) {
      console.error("Error: App Secret is required.");
      process.exit(1);
    }
    appSecret = input;
  }

  // Save app credentials
  await saveGlobalConfig({ appId, appSecret });
  await ensureEnvFile(appId, appSecret);
  console.log("App credentials saved.\n");

  // Step 2: OAuth 2.0 Authorization
  console.log("Step 2: OAuth 2.0 Authorization");
  console.log("-".repeat(40));
  console.log("This will open a browser to authorize with Feishu.");
  console.log("The authorization will grant access to:");
  console.log("  - Your calendar");
  console.log("  - Your events");
  console.log("");

  const port = 3000;
  const state = generateRandomString(32);
  const redirectUri = `http://localhost:${port}/callback`;
  const encodedRedirectUri = encodeURIComponent(redirectUri);
  const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${appId}&redirect_uri=${encodedRedirectUri}&state=${state}`;

  console.log("Redirect URI (must be configured in Feishu Console):");
  console.log(`  ${redirectUri}\n`);
  console.log("Opening authorization URL...");
  console.log("");

  // Start local server and open browser
  let authCode: string | null = null;
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url?.startsWith("/callback")) {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      const receivedState = url.searchParams.get("state");

      if (!code) {
        res.writeHead(400);
        res.end("No code received");
        return;
      }

      if (receivedState !== state) {
        res.writeHead(400);
        res.end("State mismatch");
        return;
      }

      authCode = code;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <head><title>Authorization Successful</title></head>
          <body>
            <h1>Authorization Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
      `);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      openBrowser(authUrl);
      resolve();
    });
  });

  // Wait for callback with timeout
  const timeout = 5 * 60 * 1000;
  const startTime = Date.now();

  const waitForAuth = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (authCode) {
          clearInterval(interval);
          resolve(authCode);
        }
        if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error("Authorization timeout"));
        }
      }, 500);
    });
  };

  try {
    await waitForAuth();
  } catch (error) {
    console.error("Authorization timeout. Please run setup again.");
    server.close();
    process.exit(1);
  }

  console.log("Authorization code received, exchanging for access token...");

  // Exchange code for token
  const tokenResponse = await exchangeCodeForToken(appId, appSecret, authCode!, redirectUri);

  if (tokenResponse.code !== 0 || !tokenResponse.data) {
    console.error("Failed to get access token:", tokenResponse.msg);
    server.close();
    process.exit(1);
  }

  const { access_token, refresh_token, user_id, name } = tokenResponse.data;

  console.log("Access token received!\n");
  console.log(`  User ID:  ${user_id}`);
  console.log(`  Name:     ${name}`);
  console.log("");

  // Save tokens to global config
  await saveGlobalConfig({
    userAccessToken: access_token,
    refreshToken: refresh_token,
  });

  console.log("Configuration saved to ~/.feishu-agent/config.json\n");

  // Step 3: Get Base Token for Bitable
  console.log("Step 3: Feishu Bitable (多维表格)");
  console.log("-".repeat(40));

  let baseToken: string | null = null;
  while (!baseToken) {
    const input = prompt("Enter Feishu Base URL (or Base Token): ");
    if (!input) {
      console.error("Error: Base Token is required.");
      process.exit(1);
    }
    baseToken = extractBaseToken(input);
    if (!baseToken) {
      console.error("Invalid input. Could not extract Base Token.");
      console.log("Example: https://xxx.feishu.cn/base/basexxxxxx");
    }
  }

  console.log(`Detected Base Token: ${baseToken}`);
  console.log("Fetching schema...");

  const client = new FeishuClient({
    appId,
    appSecret,
    userAccessToken: access_token,
    refreshToken: refresh_token,
  });
  const engine = new IntrospectionEngine(client);

  try {
    const schema = await engine.introspect(baseToken, (msg) => console.log(msg));
    await writeFile(".feishu_agent/schema.json", JSON.stringify(schema, null, 2));
    console.log("Schema saved to .feishu_agent/schema.json\n");
  } catch (error) {
    console.error("Failed to fetch schema:", error instanceof Error ? error.message : String(error));
    // Continue anyway - schema is optional
  }

  server.close();

  console.log("========================================");
  console.log("  Setup Complete!");
  console.log("========================================\n");
  console.log("You can now use the following commands:");
  console.log("  feishu-agent calendar list          - List your calendars");
  console.log("  feishu-agent calendar event list    - List events in a calendar");
  console.log("  feishu-agent todo list              - List todos from Bitable");
  console.log("  feishu-agent contact list           - List contacts");
  console.log("");
}

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;

  switch (platform) {
    case "win32":
      cmd = `start ${url}`;
      break;
    case "darwin":
      cmd = `open "${url}"`;
      break;
    default:
      cmd = `xdg-open "${url}"`;
      break;
  }

  exec(cmd, (error) => {
    if (error) {
      console.log("Could not auto-open browser. Please manually visit the URL:");
      console.log(url);
    }
  });
}

async function exchangeCodeForToken(
  appId: string,
  appSecret: string,
  code: string,
  redirectUri: string
): Promise<UserAccessTokenResponse> {
  // 使用飞书身份认证 v1 API
  // https://open.feishu.cn/document/ukTMukTMukTM/ukDMz4SMxQjL0MjN
  const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: code,
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  const text = await response.text();

  // 调试输出：查看原始响应
  console.log("Token exchange response status:", response.status);
  if (response.status !== 200 || text.includes("error")) {
    console.log("Response body:", text);
  }

  // 处理空响应
  if (!text || text.trim() === "") {
    throw new Error("Empty response from Feishu API");
  }

  try {
    const data = JSON.parse(text);
    // 如果返回错误，打印详细信息
    if (data.code !== 0) {
      throw new Error(`Feishu API error: ${data.msg || data.message || JSON.stringify(data)}`);
    }
    return data;
  } catch (parseError) {
    throw new Error(`Failed to parse JSON response: ${text.substring(0, 200)}. Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
}

function extractBaseToken(input: string): string | null {
  const urlMatch = input.match(/\/base\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  if (/^(base|app)[a-zA-Z0-9]+$/.test(input)) {
    return input;
  }
  return null;
}

async function ensureEnvFile(appId: string, appSecret: string): Promise<void> {
  const envFile = Bun.file(".env");
  if (!(await envFile.exists())) {
    const envContent = `FEISHU_APP_ID=${appId}\nFEISHU_APP_SECRET=${appSecret}\n`;
    await writeFile(".env", envContent);
    console.log("Created .env file with credentials.");
  } else {
    console.log(".env file already exists.");
  }
}
