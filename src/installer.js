/**
 * installer.js
 *
 * The integration registry. Each marketing tool is a self-contained object.
 * To add a new tool: add one entry to INTEGRATIONS and add it to the CLI choices.
 *
 * Exports:
 *   INTEGRATIONS         — full registry for introspection
 *   checkPrereqs         — checks whether required binaries are installed
 *   buildConfigs         — builds mcpServers config blocks
 *   getNextSteps         — post-install credential instructions
 *   getLabel             — human-readable tool name
 *   getAllToolIds         — all known tool IDs
 *   getInstalledToolIds  — tool IDs currently in a Claude Desktop config
 *   runDoctorChecks      — detailed health check for a single tool
 */

import fs from 'fs';
import { execa } from 'execa';

// ─── Integration Registry ──────────────────────────────────────────────────

export const INTEGRATIONS = {
  ga4: {
    label: 'Google Analytics 4',
    configKey: 'google-analytics',
    category: 'analytics',

    prereq: {
      command: 'uv',
      what: 'uv (Python package manager)',
      installUrl: 'https://docs.astral.sh/uv/getting-started/installation/',
    },

    mcpConfig: () => ({
      command: 'uvx',
      args: ['mcp-server-google-analytics'],
      env: {
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
        GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID || '',
      },
    }),

    requiredEnvVars: [
      {
        key: 'GOOGLE_APPLICATION_CREDENTIALS',
        description: 'Path to your Google Cloud service account JSON key file',
        type: 'file',
        guide: 'Create a service account in Google Cloud Console → IAM → Service Accounts → add Analytics Viewer role',
      },
      {
        key: 'GA4_PROPERTY_ID',
        description: 'Your GA4 property ID number',
        guide: 'Find in GA4 → Admin → Property Settings → Property ID',
      },
    ],

    nextSteps: [
      'Create a Google Cloud service account with the Analytics Viewer role.',
      'Download its JSON key and set: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json',
      'Set: GA4_PROPERTY_ID=your_property_id_number (find it in GA4 → Admin → Property Settings)',
    ],
  },

  gsc: {
    label: 'Google Search Console',
    configKey: 'google-search-console',
    category: 'analytics',

    prereq: {
      command: 'npx',
      what: 'Node.js / npx',
      installUrl: 'https://nodejs.org',
    },

    mcpConfig: () => ({
      command: 'npx',
      args: ['-y', '@ahonn/mcp-server-gsc'],
      env: {
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
        GSC_SITE_URL: process.env.GSC_SITE_URL || '',
      },
    }),

    requiredEnvVars: [
      {
        key: 'GOOGLE_APPLICATION_CREDENTIALS',
        description: 'Path to your Google Cloud service account JSON key file',
        type: 'file',
        guide: 'Same key file as GA4 — also add the service account as a user in Search Console',
      },
      {
        key: 'GSC_SITE_URL',
        description: 'Your website URL exactly as it appears in Search Console',
        guide: 'Must match exactly, e.g. https://yourdomain.com',
      },
    ],

    nextSteps: [
      'Use the same service account key from GA4 — add it as a user in Search Console.',
      'Set: GSC_SITE_URL=https://yourdomain.com (must match the property in Search Console)',
    ],
  },

  hubspot: {
    label: 'HubSpot',
    configKey: 'hubspot',
    category: 'crm',

    prereq: null,

    mcpConfig: () => ({
      type: 'sse',
      url: 'https://mcp.hubspot.com/sse',
    }),

    requiredEnvVars: [],

    nextSteps: [
      'Visit https://mcp.hubspot.com to connect your HubSpot account.',
      'Claude Desktop will authenticate via browser when it first connects.',
    ],
  },

  notion: {
    label: 'Notion',
    configKey: 'notion',
    category: 'content',

    prereq: {
      command: 'npx',
      what: 'Node.js / npx',
      installUrl: 'https://nodejs.org',
    },

    mcpConfig: () => ({
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: {
        NOTION_API_KEY: process.env.NOTION_API_KEY || '',
      },
    }),

    requiredEnvVars: [
      {
        key: 'NOTION_API_KEY',
        description: 'Your Notion integration token (starts with secret_)',
        guide: 'Create at notion.com/my-integrations → New integration → copy Internal Integration Token',
      },
    ],

    nextSteps: [
      'Go to notion.com/my-integrations and create a new integration.',
      'Copy the "Internal Integration Token" — it starts with secret_.',
      'Set: NOTION_API_KEY=secret_xxxxxxxx',
      'Share any Notion pages you want Claude to read with your integration.',
    ],
  },

  slack: {
    label: 'Slack',
    configKey: 'slack',
    category: 'comms',

    prereq: {
      command: 'npx',
      what: 'Node.js / npx',
      installUrl: 'https://nodejs.org',
    },

    mcpConfig: () => ({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
        SLACK_TEAM_ID: process.env.SLACK_TEAM_ID || '',
      },
    }),

    requiredEnvVars: [
      {
        key: 'SLACK_BOT_TOKEN',
        description: 'Slack bot token (starts with xoxb-)',
        guide: 'Create at api.slack.com/apps → your app → OAuth & Permissions → Bot User OAuth Token',
      },
      {
        key: 'SLACK_TEAM_ID',
        description: 'Your Slack workspace ID (starts with T)',
        guide: 'Open Slack in a browser — your workspace URL contains the team ID',
      },
    ],

    nextSteps: [
      'Go to api.slack.com/apps and create a new app.',
      'Add Bot Token Scopes: channels:read, channels:history, chat:write.',
      'Install the app to your workspace and copy the Bot User OAuth Token.',
      'Set: SLACK_BOT_TOKEN=xoxb-xxxxxxxx',
      'Set: SLACK_TEAM_ID=T0123456789 (find in your Slack workspace URL)',
    ],
  },
};

// ─── Internal helpers ──────────────────────────────────────────────────────

async function commandExists(cmd) {
  try {
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    await execa(checkCmd, [cmd], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Checks prerequisites for a list of tool IDs.
 * @param {string[]} tools
 * @returns {Promise<Record<string, object>>}
 */
export async function checkPrereqs(tools) {
  const results = {};
  await Promise.all(
    tools.map(async (toolId) => {
      const integration = INTEGRATIONS[toolId];
      if (!integration) return;
      if (!integration.prereq) {
        results[toolId] = { ok: true, type: 'remote', label: integration.label };
        return;
      }
      const installed = await commandExists(integration.prereq.command);
      results[toolId] = {
        ok: installed,
        type: 'local',
        label: integration.label,
        command: integration.prereq.command,
        what: integration.prereq.what,
        installUrl: integration.prereq.installUrl,
      };
    })
  );
  return results;
}

/**
 * Builds mcpServers config blocks for the given tool IDs.
 * @param {string[]} tools
 * @returns {Record<string, object>}
 */
export function buildConfigs(tools) {
  return tools.reduce((acc, toolId) => {
    const integration = INTEGRATIONS[toolId];
    if (!integration) return acc;
    acc[integration.configKey] = integration.mcpConfig();
    return acc;
  }, {});
}

/**
 * Returns post-install credential instructions for each tool.
 * @param {string[]} tools
 * @returns {{ label: string, steps: string[] }[]}
 */
export function getNextSteps(tools) {
  return tools
    .map((toolId) => INTEGRATIONS[toolId])
    .filter(Boolean)
    .filter((integration) => integration.nextSteps?.length > 0)
    .map(({ label, nextSteps }) => ({ label, steps: nextSteps }));
}

/**
 * Returns the display label for a tool ID.
 * @param {string} toolId
 * @returns {string}
 */
export function getLabel(toolId) {
  return INTEGRATIONS[toolId]?.label ?? toolId;
}

/**
 * Returns all known tool IDs from the registry.
 * @returns {string[]}
 */
export function getAllToolIds() {
  return Object.keys(INTEGRATIONS);
}

/**
 * Given a parsed Claude Desktop config, returns the tool IDs of Meridian tools in it.
 * @param {object} config - parsed claude_desktop_config.json
 * @returns {string[]}
 */
export function getInstalledToolIds(config) {
  const keyToId = Object.fromEntries(
    Object.entries(INTEGRATIONS).map(([id, int]) => [int.configKey, id])
  );
  return Object.keys(config.mcpServers || {})
    .map((key) => keyToId[key])
    .filter(Boolean);
}

/**
 * Runs health checks for a single tool: prereq, env vars, file validity.
 * @param {string} toolId
 * @returns {Promise<{ label: string, checks: { label: string, ok: boolean, fix: string|null }[] }|null>}
 */
export async function runDoctorChecks(toolId) {
  const integration = INTEGRATIONS[toolId];
  if (!integration) return null;

  const checks = [];

  if (integration.prereq) {
    const ok = await commandExists(integration.prereq.command);
    checks.push({
      label: `${integration.prereq.command} is installed`,
      ok,
      fix: ok ? null : `Install from ${integration.prereq.installUrl}`,
    });
  }

  if (!integration.prereq && integration.requiredEnvVars.length === 0) {
    checks.push({
      label: 'Uses browser authentication — no local credentials needed',
      ok: true,
      fix: null,
    });
    return { label: integration.label, checks };
  }

  for (const envVar of integration.requiredEnvVars) {
    const value = process.env[envVar.key];
    const isSet = Boolean(value);

    checks.push({
      label: `${envVar.key} is set`,
      ok: isSet,
      fix: isSet ? null : envVar.guide,
    });

    if (isSet && envVar.type === 'file') {
      const exists = fs.existsSync(value);
      checks.push({
        label: 'Credentials file exists',
        ok: exists,
        fix: exists ? null : `File not found: ${value}`,
      });

      if (exists) {
        let valid = false;
        try {
          JSON.parse(fs.readFileSync(value, 'utf-8'));
          valid = true;
        } catch {
          // invalid JSON
        }
        checks.push({
          label: 'Credentials file is valid JSON',
          ok: valid,
          fix: valid ? null : 'File appears corrupted — re-download from Google Cloud Console.',
        });
      }
    }
  }

  return { label: integration.label, checks };
}
