import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

export interface FeishuConfig {
  appId: string;
  appSecret: string;
}

/**
 * Returns the path to the global configuration file.
 */
export function getConfigPaths(): string {
  return join(homedir(), ".feishu-agent", "config.json");
}

/**
 * Loads configuration from CLI arguments, environment variables, and global config file.
 * Priority: CLI Args > process.env > Global Config.
 */
export async function loadConfig(cliArgs?: Partial<FeishuConfig>): Promise<FeishuConfig> {
  const globalConfigPath = getConfigPaths();
  let globalConfig: Partial<FeishuConfig> = {};

  try {
    const file = Bun.file(globalConfigPath);
    if (await file.exists()) {
      globalConfig = await file.json();
    }
  } catch (error) {
    // Ignore errors reading global config
  }

  const envConfig: Partial<FeishuConfig> = {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
  };

  return {
    appId: cliArgs?.appId || envConfig.appId || globalConfig.appId || "",
    appSecret: cliArgs?.appSecret || envConfig.appSecret || globalConfig.appSecret || "",
  };
}

/**
 * Saves the provided configuration to the global configuration file.
 */
export async function saveGlobalConfig(config: Partial<FeishuConfig>): Promise<void> {
  const globalConfigPath = getConfigPaths();
  const configDir = join(homedir(), ".feishu-agent");

  let currentConfig: Partial<FeishuConfig> = {};
  try {
    const file = Bun.file(globalConfigPath);
    if (await file.exists()) {
      currentConfig = await file.json();
    }
  } catch (error) {
    // Ignore errors reading existing config
  }

  const newConfig = { ...currentConfig, ...config };

  // Ensure the directory exists
  await mkdir(configDir, { recursive: true });

  await Bun.write(globalConfigPath, JSON.stringify(newConfig, null, 2));
}
