/**
 * config-writer.js
 * Reads, merges, and writes the Claude Desktop mcpServers config.
 * Never overwrites — always reads first, merges new servers in, then writes back.
 * Always backs up the existing file before writing (keeps last 3 backups).
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Returns the absolute path to Claude Desktop's config file.
 * @param {'mac'|'windows'|'auto'} platform
 * @returns {string}
 */
export function getConfigPath(platform) {
  const resolved =
    platform === 'auto' ? (process.platform === 'win32' ? 'windows' : 'mac') : platform;

  if (resolved === 'mac') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json'
    );
  }
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'Claude', 'claude_desktop_config.json');
}

/**
 * Reads the current config from disk. Returns { mcpServers: {} } if missing or invalid.
 * @param {string} configPath
 * @returns {object}
 */
export function readConfig(configPath) {
  if (!fs.existsSync(configPath)) return { mcpServers: {} };
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return { mcpServers: {} };
  }
}

/**
 * Backs up the config file. Keeps only the last 3 backups.
 * @param {string} configPath
 * @returns {string|null} path to backup file, or null if nothing to back up
 */
export function backupConfig(configPath) {
  if (!fs.existsSync(configPath)) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = `${configPath}.${timestamp}.bak`;
  fs.copyFileSync(configPath, backupPath);

  const dir = path.dirname(configPath);
  const base = path.basename(configPath);
  const backups = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(base) && f.endsWith('.bak'))
    .sort()
    .map((f) => path.join(dir, f));

  for (const old of backups.slice(0, -3)) {
    try {
      fs.unlinkSync(old);
    } catch {
      // non-fatal
    }
  }

  return backupPath;
}

/**
 * Merges new mcpServers into existing config and writes to disk.
 * Always backs up first. Creates the parent directory if needed.
 *
 * @param {string} configPath
 * @param {object} newServers - map of server name → server config object
 * @returns {{ written: string[], skipped: string[], backup: string|null }}
 */
export function writeConfig(configPath, newServers) {
  const backup = backupConfig(configPath);
  const existing = readConfig(configPath);

  if (!existing.mcpServers) existing.mcpServers = {};

  const written = [];
  const skipped = [];

  for (const [name, config] of Object.entries(newServers)) {
    if (existing.mcpServers[name]) {
      skipped.push(name);
    } else {
      existing.mcpServers[name] = config;
      written.push(name);
    }
  }

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2), 'utf-8');

  return { written, skipped, backup };
}

/**
 * Force-overwrites mcpServer entries (used by `meridian update`).
 * Unlike writeConfig, does not skip existing entries.
 *
 * @param {string} configPath
 * @param {object} servers - map of server name → server config object
 * @returns {{ updated: string[], backup: string|null }}
 */
export function updateConfig(configPath, servers) {
  const backup = backupConfig(configPath);
  const existing = readConfig(configPath);

  if (!existing.mcpServers) existing.mcpServers = {};

  const updated = [];
  for (const [name, config] of Object.entries(servers)) {
    existing.mcpServers[name] = config;
    updated.push(name);
  }

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2), 'utf-8');

  return { updated, backup };
}

/**
 * Removes mcpServer entries by config key (used by `meridian remove`).
 * Always backs up first.
 *
 * @param {string} configPath
 * @param {string[]} configKeys - server names to remove from mcpServers
 * @returns {{ removed: string[], notFound: string[], backup: string|null }}
 */
export function removeFromConfig(configPath, configKeys) {
  const backup = backupConfig(configPath);
  const existing = readConfig(configPath);

  const removed = [];
  const notFound = [];

  for (const key of configKeys) {
    if (existing.mcpServers?.[key]) {
      delete existing.mcpServers[key];
      removed.push(key);
    } else {
      notFound.push(key);
    }
  }

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2), 'utf-8');

  return { removed, notFound, backup };
}
