import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

export interface ContactCacheEntry {
  name: string;
  email?: string;
  user_id?: string; // Also store user_id for lookup
  union_id?: string;
  open_id?: string; // Store open_id for calendar attendees API
}

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  userAccessToken?: string;
  refreshToken?: string;
}

/**
 * Returns the path to the global configuration file.
 */
export function getConfigPath(): string {
  return join(homedir(), ".feishu-agent", "config.json");
}

/**
 * Returns the path to the contact cache file.
 */
export function getContactCachePath(): string {
  return join(homedir(), ".feishu-agent", "contact-cache.json");
}

/**
 * Loads configuration from global config file.
 */
export async function loadConfig(): Promise<FeishuConfig> {
  const configPath = getConfigPath();
  let config: Partial<FeishuConfig> = {};

  try {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      config = await file.json();
    }
  } catch {
    // Ignore errors
  }

  return {
    appId: config.appId || "",
    appSecret: config.appSecret || "",
    userAccessToken: config.userAccessToken,
    refreshToken: config.refreshToken,
  };
}

/**
 * Saves the provided configuration to the global configuration file.
 */
export async function saveGlobalConfig(config: Partial<FeishuConfig>): Promise<void> {
  const configPath = getConfigPath();
  const configDir = join(homedir(), ".feishu-agent");

  let currentConfig: Partial<FeishuConfig> = {};
  try {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      currentConfig = await file.json();
    }
  } catch {
    // Ignore errors
  }

  const newConfig = { ...currentConfig, ...config };

  await mkdir(configDir, { recursive: true });
  await Bun.write(configPath, JSON.stringify(newConfig, null, 2));
}

/**
 * Saves a contact entry to the contact cache.
 * Key is union_id, value is name, email, and user_id.
 */
export async function saveContactToCache(unionId: string, entry: ContactCacheEntry): Promise<void> {
  const cachePath = getContactCachePath();
  const cacheDir = join(homedir(), ".feishu-agent");

  let contactCache: Record<string, ContactCacheEntry> = {};
  try {
    const file = Bun.file(cachePath);
    if (await file.exists()) {
      contactCache = await file.json();
    }
  } catch {
    // Ignore errors
  }

  contactCache[unionId] = entry;

  await mkdir(cacheDir, { recursive: true });
  await Bun.write(cachePath, JSON.stringify(contactCache, null, 2));
}

/**
 * Loads all cached contacts.
 */
export async function loadContactCache(): Promise<Record<string, ContactCacheEntry>> {
  const cachePath = getContactCachePath();
  try {
    const file = Bun.file(cachePath);
    if (await file.exists()) {
      return await file.json();
    }
  } catch {
    // Ignore errors
  }
  return {};
}

/**
 * Searches cached contacts by name or email.
 */
export async function searchContactCache(query: string): Promise<{ union_id: string; user_id?: string; name: string; email?: string }[]> {
  const cache = await loadContactCache();

  if (!query) return [];

  const lowerQuery = query.toLowerCase();

  const results: { union_id: string; user_id?: string; name: string; email?: string }[] = [];
  for (const [unionId, entry] of Object.entries(cache)) {
    if (
      entry.name.toLowerCase().includes(lowerQuery) ||
      (entry.email && entry.email.toLowerCase() === lowerQuery)
    ) {
      results.push({ union_id: unionId, user_id: entry.user_id, name: entry.name, email: entry.email });
    }
  }
  return results;
}

/**
 * Gets a contact from cache by union_id or user_id.
 */
export async function getContactFromCache(id: string): Promise<ContactCacheEntry | undefined> {
  const cache = await loadContactCache();
  // Direct lookup by union_id
  if (cache[id]) return cache[id];
  // Lookup by user_id
  for (const [unionId, entry] of Object.entries(cache)) {
    if (entry.user_id === id) return entry;
  }
  return undefined;
}

/**
 * Get union_id by user_id or vice versa
 */
export async function resolveContactId(id: string): Promise<{ union_id: string; user_id?: string } | undefined> {
  const cache = await loadContactCache();
  // If id looks like union_id (starts with on_), return it directly
  if (id.startsWith('on_')) {
    const entry = cache[id];
    if (entry) return { union_id: id, user_id: entry.user_id };
    return undefined;
  }
  // Otherwise, search for user_id
  for (const [unionId, entry] of Object.entries(cache)) {
    if (entry.user_id === id) {
      return { union_id: unionId, user_id: id };
    }
  }
  return undefined;
}
