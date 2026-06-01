/**
 * status-writer.js
 *
 * Generates two files in ~/meridian-prompts/ after setup or add:
 *
 *   SETUP-STATUS.md    — what's installed, what still needs credentials.
 *                        Drag into Claude Desktop: "Help me finish setup."
 *
 *   CLAUDE-PROJECT.md  — system prompt for a Claude Project.
 *                        Paste into Project Instructions for persistent context.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { INTEGRATIONS } from './installer.js';

const PROMPTS_DIR = path.join(os.homedir(), 'meridian-prompts');

function ensurePromptsDir() {
  if (!fs.existsSync(PROMPTS_DIR)) fs.mkdirSync(PROMPTS_DIR, { recursive: true });
}

/**
 * Writes SETUP-STATUS.md showing install results and outstanding credentials.
 *
 * @param {{ tools: string[], prereqResults: object, configResult: object, configPath: string }} opts
 */
export function writeSetupStatus({ tools, prereqResults, configResult, configPath }) {
  ensurePromptsDir();

  const lines = [];
  const now = new Date().toLocaleString();

  lines.push('# Meridian Setup Status');
  lines.push(`_Generated ${now}_`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## What Was Installed');
  lines.push('');

  for (const toolId of tools) {
    const integration = INTEGRATIONS[toolId];
    if (!integration) continue;

    const prereq = prereqResults[toolId];
    const wasWritten = configResult.written.includes(integration.configKey);
    const wasSkipped = configResult.skipped.includes(integration.configKey);

    let icon, note;
    if (integration.prereq && !prereq?.ok) {
      icon = '⚠️';
      note = `prerequisite missing — install ${prereq?.what} from ${prereq?.installUrl}`;
    } else if (wasWritten) {
      icon = '✅';
      note = 'added to Claude Desktop config';
    } else if (wasSkipped) {
      icon = '🔁';
      note = 'already configured — left unchanged';
    } else {
      icon = '✅';
      note = 'configured';
    }

    lines.push(`${icon} **${integration.label}** — ${note}`);
  }

  const needsCredentials = tools.filter((id) => INTEGRATIONS[id]?.requiredEnvVars?.length > 0);

  if (needsCredentials.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## What Still Needs Setup');
    lines.push('');
    lines.push('These tools need API credentials before Claude can access your data.');
    lines.push('');

    for (const toolId of needsCredentials) {
      const integration = INTEGRATIONS[toolId];
      lines.push(`### ${integration.label}`);
      lines.push('');

      for (const envVar of integration.requiredEnvVars) {
        lines.push(`**\`${envVar.key}\`** — ${envVar.description}`);
        if (envVar.guide) lines.push(`→ ${envVar.guide}`);
        lines.push('');
      }

      if (integration.nextSteps?.length > 0) {
        lines.push('Steps:');
        for (const step of integration.nextSteps) {
          lines.push(`- ${step}`);
        }
        lines.push('');
      }
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## How to Ask Claude for Help');
  lines.push('');
  lines.push('Drag this file into Claude Desktop and say:');
  lines.push('');
  lines.push('> "Help me finish setting up Meridian. Walk me through each step."');
  lines.push('');
  lines.push("Claude will guide you through the credentials one at a time and tell you exactly what to paste where.");
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Commands');
  lines.push('');
  lines.push('```');
  lines.push("npx meridian-marketing status     # see what's running");
  lines.push('npx meridian-marketing doctor      # check for missing credentials');
  lines.push('npx meridian-marketing add <tool>  # add a tool (notion, slack, etc.)');
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Config file: \`${configPath}\``);
  lines.push(`Templates folder: \`${PROMPTS_DIR}\``);

  fs.writeFileSync(path.join(PROMPTS_DIR, 'SETUP-STATUS.md'), lines.join('\n'), 'utf-8');
}

/**
 * Writes CLAUDE-PROJECT.md — a system prompt that gives Claude persistent
 * knowledge of your installed marketing stack.
 *
 * @param {{ tools: string[], configPath: string }} opts
 */
export function writeClaudeProject({ tools, configPath }) {
  ensurePromptsDir();

  const TOOL_CAPS = {
    ga4: 'Pull traffic data, sessions, conversions, top pages, user behavior, and acquisition sources.',
    gsc: 'Query keyword rankings, clicks, impressions, CTR, and search performance data.',
    hubspot: 'Access deals, contacts, email campaigns, and pipeline data.',
    notion: 'Read and update content calendars, campaign briefs, and planning docs.',
    slack: 'Post reports to channels, read message history, and share summaries.',
  };

  const installedTools = tools
    .map((id) => ({ id, integration: INTEGRATIONS[id] }))
    .filter(({ integration }) => Boolean(integration));

  const lines = [];
  lines.push('# Meridian — Marketing Stack');
  lines.push('');
  lines.push('You have real-time access to the following marketing tools:');
  lines.push('');

  for (const { integration } of installedTools) {
    lines.push(`- **${integration.label}**`);
  }

  lines.push('');
  lines.push('## Rules');
  lines.push('');
  lines.push('- Always pull real data before answering questions about traffic, rankings, or performance.');
  lines.push('- Never estimate or guess numbers — use the connected tools.');
  lines.push('- If a tool fails, say exactly what error came back and what the user needs to fix.');
  lines.push('- Format reports with the most important numbers first. Use tables where data fits, bullets elsewhere.');
  lines.push('');
  lines.push('## What Each Tool Can Do');
  lines.push('');

  for (const { id, integration } of installedTools) {
    const cap = TOOL_CAPS[id] || `Use the ${integration.label} MCP tool.`;
    lines.push(`**${integration.label}:** ${cap}`);
    lines.push('');
  }

  lines.push('## Prompt Templates');
  lines.push('');
  lines.push(`Templates are in \`${PROMPTS_DIR}\``);
  lines.push('');
  lines.push('To use one: paste the contents of any template file into this conversation.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Config: \`${configPath}\``);

  fs.writeFileSync(path.join(PROMPTS_DIR, 'CLAUDE-PROJECT.md'), lines.join('\n'), 'utf-8');
}
