#!/usr/bin/env bun
/**
 * Feishu OAuth 2.0 Authorization Script
 *
 * This script helps you get a user_access_token via OAuth 2.0 authorization code flow.
 *
 * Usage:
 *   bun run scripts/auth.ts [--port 3000] [--app-id xxx] [--app-secret xxx]
 *
 * Before running:
 *   1. Configure redirect URI in Feishu Developer Console:
 *      http://localhost:3000/callback (or your custom port)
 *   2. Set FEISHU_APP_ID and FEISHU_APP_SECRET environment variables
 *      or pass them via --app-id and --app-secret flags
 */
import { parseArgs } from "node:util";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { exec } from "node:child_process";

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
    open_id: string;
  };
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    strict: false,
    options: {
      port: { type: "string", default: "3000" },
      "app-id": { type: "string" },
      "app-secret": { type: "string" },
    },
  });

  const appId = values["app-id"] || process.env.FEISHU_APP_ID;
  const appSecret = values["app-secret"] || process.env.FEISHU_APP_SECRET;
  const port = parseInt(values["port"] as string || "3000", 10);

  if (!appId || !appSecret) {
    console.error("Error: FEISHU_APP_ID and FEISHU_APP_SECRET must be set.");
    console.error("");
    console.error("Options:");
    console.error("  1. Export environment variables:");
    console.error("     export FEISHU_APP_ID=your_app_id");
    console.error("     export FEISHU_APP_SECRET=your_app_secret");
    console.error("");
    console.error("  2. Or pass via flags:");
    console.error("     bun run scripts/auth.ts --app-id xxx --app-secret xxx");
    console.error("");
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
  const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${appId}&redirect_uri=${encodedRedirectUri}&state=${state}`;

  console.log("Redirect URI (configure this in Feishu Developer Console):");
  console.log(`  ${redirectUri}\n`);
  console.log("Authorization URL:");
  console.log(`  ${authUrl}\n`);
  console.log("Important: Make sure this redirect URI is configured in your Feishu app!");
  console.log("Go to: https://open.feishu.cn/app → Your App → Security Settings → Redirect URIs\n");
  console.log("Instructions:");
  console.log("  1. Click the URL above or paste it in your browser");
  console.log("  2. Authorize the application");
  console.log("  3. You will be redirected to localhost and the token will be captured\n");

  // Store auth info for verification
  let authCode: string | null = null;
  let authResult: { success: boolean; message: string } | null = null;

  // Create local server to receive callback
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url?.startsWith("/callback")) {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      const receivedState = url.searchParams.get("state");
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
          console.log(`  Open ID:      ${tokenData.data.open_id}`);
          console.log(`  Access Token: ${tokenData.data.access_token}`);
          console.log(`  Expires In:   ${tokenData.data.expires_in} seconds`);
          console.log(`  Refresh Token: ${tokenData.data.refresh_token}`);
          console.log("\n========================================\n");
          console.log("Save this token securely. It will be used for API calls.");
          console.log("Token will expire in", Math.floor(tokenData.data.expires_in / 60), "minutes.");
          console.log("Use refresh token to get new access token when expired.\n");
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
  const response = await fetch("https://open.feishu.cn/open-apis/authen/v3/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: code,
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  return response.json();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
