/**
 * installer.js
 *
 * Knows how to install each marketing MCP integration.
 * Each integration is a self-contained object — to add a new tool later,
 * add one entry to INTEGRATIONS and nothing else needs to change.
 *
 * Responsibilities:
 *   - Define what each integration needs (command, config, env hints)
 *   - Check whether prerequisites are installed on the user's machine
 *   - Build the mcpServers config block for Claude Desktop
 *   - Return post-install guidance specific to each tool
 */

import { execa } from 'execa';

// ─── Integration Registry ──────────────────────────────────────────────────
//
// Adding a new integration later:
//   1. Add an entry here with the same shape
//   2. Add the tool ID to the inquirer choices in cli.js
//   3. Done — everything else (config writing, summaries) is automatic
//
const INTEGRATIONS = {
  ga4: {
    label: 'Google Analytics 4',
    configKey: 'google-analytics',

    // What must exist on PATH for this to work
    prereq: {
      command: 'uv',
      what: 'uv (Python package manager)',
      installUrl: 'https://docs.astral.sh/uv/getting-started/installation/',
    },

    // The mcpServers block written to Claude Desktop config
    mcpConfig: () => ({
      command: 'uvx',
      args: ['mcp-server-google-analytics'],
      env: {
        // Placeholder — user must set this in their shell profile or .env
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
        GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID || '',
      },
    }),

    // Printed after setup so the user knows exactly what to do next
    nextSteps: [
      'Create a Google Cloud service account with the Analytics Viewer role.',
      'Download its JSON key and set: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json',
      'Set: GA4_PROPERTY_ID=your_property_id_number (find it in GA4 → Admin → Property Settings)',
    ],
  },

  gsc: {
    label: 'Google Search Console',
    configKey: 'google-search-console',

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

    nextSteps: [
      'Use the same service account key from GA4 — add it as a user in Search Console.',
      'Set: GSC_SITE_URL=https://yourdomain.com (must match the property in Search Console)',
    ],
  },

  hubspot: {
    label: 'HubSpot',
    configKey: 'hubspot',

    // Remote SSE — no local binary needed
    prereq: null,

    mcpConfig: () => ({
      type: 'sse',
      url: 'https://mcp.hubspot.com/sse',
    }),

    nextSteps: [
      'Visit https://mcp.hubspot.com to connect your HubSpot account.',
      'Claude Desktop will authenticate via browser when it first connects.',
    ],
  },
};

// ─── Prereq Checking ───────────────────────────────────────────────────────

/**
 * Returns true if a command exists on the user's PATH.
 */
async function commandExists(cmd) {
  try {
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    await execa(checkCmd, [cmd], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks prerequisites for a list of selected tool IDs.
 * Returns a map of tool ID → { ok, label, ...prereq info }
 *
 * @param {string[]} tools - e.g. ['ga4', 'gsc', 'hubspot']
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

// ─── Config Builder ────────────────────────────────────────────────────────

/**
 * Builds the mcpServers config block for the given tools.
 * This is what gets merged into claude_desktop_config.json.
 *
 * @param {string[]} tools - e.g. ['ga4', 'hubspot']
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

// ─── Post-Install Guidance ─────────────────────────────────────────────────

/**
 * Returns an array of { label, steps } for each installed tool.
 * Printed after setup so users know what to configure.
 *
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
