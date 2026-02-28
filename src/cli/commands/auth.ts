#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadConfig, saveGlobalConfig } from "../../core/config";

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

export async function authCommand() {
  const { values } = parseArgs({
    args: process.argv.slice(3), // Get args from command line
    strict: false,
    options: {
      port: { type: "string", default: "3000" },
    },
  });

  // Load global config
  const config = await loadConfig();
  const appId = config.appId;
  const appSecret = config.appSecret;
  const port = parseInt(values["port"] as string || "3000", 10);

  if (!appId || !appSecret) {
    console.error("Error: FEISHU_APP_ID and FEISHU_APP_SECRET must be set.");
    console.error("Run 'feishu-agent setup' or export environment variables.");
    process.exit(1);
  }

  console.log("\n=== Feishu OAuth 2.0 Authorization ===\n");
  console.log("Step 1: Generating authorization URL...\n");

  // Generate a random state for security
  const state = generateRandomString(32);
  const redirectUri = `http://localhost:${port}/callback`;

  // URL encode the redirect_uri
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  // Construct the authorization URL
  // Note: Scopes must be configured in Feishu Developer Console, not in the URL
  const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${appId}&redirect_uri=${encodedRedirectUri}&state=${state}`;

  console.log("Redirect URI (configure this in Feishu Developer Console):");
  console.log(`  ${redirectUri}\n`);
  console.log("Authorization URL:");
  console.log(`  ${authUrl}\n`);
  console.log("Required permissions (configure in Feishu Developer Console):");
  console.log("  - calendar:calendar  (查看和管理用户的日历)");
  console.log("  - calendar:event     (管理用户日历下的日程)");
  console.log("\nInstructions:");
  console.log("  1. Make sure the redirect URI is configured in your Feishu app settings (安全设置)");
  console.log("  2. Make sure the required permissions are enabled in your app (权限管理)");
  console.log("  3. Click the URL above or paste it in your browser");
  console.log("  4. Authorize the application");
  console.log("  5. You will be redirected to localhost and the token will be captured\n");

  // Store auth info for verification
  let authCode: string | null = null;
  let receivedState: string | null = null;
  let authResult: { success: boolean; message: string } | null = null;

  // Create local server to receive callback
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url?.startsWith("/callback")) {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      receivedState = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        authResult = { success: false, message: `Authorization error: ${error}` };
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head><title>Authorization Failed</title></head>
            <body>
              <h1>Authorization Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        server.close();
        return;
      }

      if (!code) {
        authResult = { success: false, message: "No authorization code received" };
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head><title>Authorization Failed</title></head>
            <body>
              <h1>Authorization Failed</h1>
              <p>No authorization code received.</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        server.close();
        return;
      }

      authCode = code;

      // Verify state
      if (receivedState !== state) {
        authResult = { success: false, message: "State mismatch - possible CSRF attack" };
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head><title>Authorization Failed</title></head>
            <body>
              <h1>Authorization Failed</h1>
              <p>State verification failed. Please try again.</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        server.close();
        return;
      }

      // Show success page
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <head><title>Authorization Successful</title></head>
          <body>
            <h1>Authorization Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
            <script>setTimeout(() => window.close(), 5000);</script>
          </body>
        </html>
      `);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  server.listen(port, () => {
    console.log(`Step 2: Local server started on http://localhost:${port}`);
    console.log(`Step 3: Opening authorization URL in your browser...\n`);

    // Try to open the browser
    openBrowser(authUrl);
  });

  // Wait for callback with timeout
  const timeout = 5 * 60 * 1000; // 5 minutes
  const startTime = Date.now();

  const checkInterval = setInterval(async () => {
    if (authCode) {
      clearInterval(checkInterval);
      clearTimeout(timeoutId);

      console.log("\nStep 4: Authorization code received, exchanging for access token...\n");

      try {
        const tokenData = await exchangeCodeForToken(appId, appSecret, authCode, redirectUri);

        if (tokenData.code === 0 && tokenData.data) {
          console.log("========================================");
          console.log("  SUCCESS! User Access Token Received");
          console.log("========================================\n");
          console.log(`  User ID:      ${tokenData.data.user_id}`);
          console.log(`  Name:         ${tokenData.data.name}`);
          console.log(`  Union ID:     ${tokenData.data.union_id}`);
          console.log(`  Access Token: ${tokenData.data.access_token}`);
          console.log(`  Expires In:   ${tokenData.data.expires_in} seconds`);
          console.log(`  Refresh Token: ${tokenData.data.refresh_token}`);
          console.log("\n========================================\n");

          // Save to global config
          try {
            await saveGlobalConfig({
              userAccessToken: tokenData.data.access_token,
              refreshToken: tokenData.data.refresh_token,
            });
            console.log("Tokens saved to ~/.feishu-agent/config.json\n");
            console.log("You can now use calendar and other commands that require user authorization.");
          } catch (saveError) {
            console.error("Warning: Failed to save tokens to config file:");
            console.error(saveError);
            console.log("\nPlease save the tokens manually:");
            console.log(`  export FEISHU_USER_ACCESS_TOKEN="${tokenData.data.access_token}"`);
            console.log(`  export FEISHU_REFRESH_TOKEN="${tokenData.data.refresh_token}"`);
          }
          console.log("\nNote: Token will expire in", Math.floor(tokenData.data.expires_in / 60), "minutes.");
          console.log("Token refresh is automatic. Just run 'feishu-agent auth' again when it expires.\n");
        } else {
          console.error("Failed to exchange code for token:");
          console.error(tokenData.msg || "Unknown error");
        }
      } catch (error) {
        console.error("Error exchanging token:", error);
      } finally {
        server.close();
        process.exit(authResult?.success !== false ? 0 : 1);
      }
    }

    // Check timeout
    if (Date.now() - startTime > timeout) {
      clearInterval(checkInterval);
      console.error("\nAuthorization timed out after 5 minutes.");
      console.error("Please run the command again and complete authorization.");
      server.close();
      process.exit(1);
    }
  }, 500);

  const timeoutId = setTimeout(() => {
    clearInterval(checkInterval);
    console.error("\nAuthorization timed out.");
    server.close();
    process.exit(1);
  }, timeout);
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

  import("node:child_process").then(({ exec }) => {
    exec(cmd, (error) => {
      if (error) {
        console.log("Could not auto-open browser. Please manually visit the URL:");
        console.log(url);
      }
    });
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
  console.log("Token exchange response status:", response.status);

  // 处理空响应
  if (!text || text.trim() === "") {
    throw new Error("Empty response from Feishu API");
  }

  try {
    const data = JSON.parse(text);
    if (data.code !== 0) {
      throw new Error(`Feishu API error: ${data.msg || data.message || JSON.stringify(data)}`);
    }
    return data;
  } catch (parseError) {
    console.log("Raw response:", text.substring(0, 500));
    throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
}
