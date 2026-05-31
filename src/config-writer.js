/**
 * config-writer.js
 * Reads, merges, and writes the Claude Desktop mcpServers config.
 * Never overwrites — always reads first, merges new servers in, then writes back.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Returns the absolute path to Claude Desktop's config file based on OS.
 * @param {'mac'|'windows'} platform
 * @returns {string}
 */
export function getConfigPath(platform) {
  if (platform === 'mac') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json'
    );
  }
  // Windows uses %APPDATA% which Node exposes via process.env.APPDATA
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'Claude', 'claude_desktop_config.json');
}

/**
 * Reads existing config from disk. Returns empty object if file doesn't exist.
 * @param {string} configPath
 * @returns {object}
 */
function readExistingConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    // If the file exists but is malformed JSON, return empty rather than crashing
    return {};
  }
}

/**
 * Merges new mcpServers into existing config and writes to disk.
 * Creates the parent directory if it doesn't exist.
 *
 * @param {string} configPath - Absolute path to claude_desktop_config.json
 * @param {object} newServers - Map of server name → server config object
 * @returns {{ written: string[], skipped: string[] }}
 */
export function writeConfig(configPath, newServers) {
  const existing = readExistingConfig(configPath);

  // Ensure the mcpServers key exists
  if (!existing.mcpServers) {
    existing.mcpServers = {};
  }

  const written = [];
  const skipped = [];

  for (const [name, config] of Object.entries(newServers)) {
    if (existing.mcpServers[name]) {
      // Server already configured — don't overwrite, just note it
      skipped.push(name);
    } else {
      existing.mcpServers[name] = config;
      written.push(name);
    }
  }

  // Ensure parent directory exists (first-run case where Claude hasn't been opened yet)
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2), 'utf-8');

  return { written, skipped };
}
