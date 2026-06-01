#!/usr/bin/env node
/**
 * cli.js — entry point for the meridian CLI
 *
 * Commands:
 *   setup   First-time install and configuration (interactive)
 *   add     Add one or more tools without re-running full setup
 *   status  Show what's installed and whether credentials are present
 *   doctor  Run health checks — prereqs, env vars, file validity
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

import {
  INTEGRATIONS,
  checkPrereqs,
  buildConfigs,
  getNextSteps,
  getLabel,
  getAllToolIds,
  getInstalledToolIds,
  runDoctorChecks,
} from './installer.js';
import { getConfigPath, readConfig, writeConfig } from './config-writer.js';
import { writeSetupStatus, writeClaudeProject } from './status-writer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.join(os.homedir(), 'meridian-prompts');

function detectOs() {
  return process.platform === 'win32' ? 'windows' : 'mac';
}

// ─── Banner ───────────────────────────────────────────────────────────────

function showBanner() {
  console.log();
  console.log(chalk.bold.magenta('  ┌─────────────────────────────────────┐'));
  console.log(chalk.bold.magenta('  │           M E R I D I A N           │'));
  console.log(chalk.bold.magenta('  └─────────────────────────────────────┘'));
  console.log();
  console.log(chalk.gray('  Marketing intelligence for Claude Desktop'));
  console.log(chalk.gray('  Configure your marketing tools in 60 seconds.'));
  console.log();
}

// ─── Questions ────────────────────────────────────────────────────────────

async function askQuestions() {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'os',
      message: 'What is your operating system?',
      choices: [
        { name: 'Mac', value: 'mac' },
        { name: 'Windows', value: 'windows' },
      ],
    },
    {
      type: 'checkbox',
      name: 'tools',
      message: 'Which marketing tools do you use?',
      choices: [
        { name: 'Google Analytics 4', value: 'ga4', checked: true },
        { name: 'Google Search Console', value: 'gsc', checked: true },
        { name: 'HubSpot', value: 'hubspot' },
        { name: 'Notion', value: 'notion' },
        { name: 'Slack', value: 'slack' },
      ],
      validate: (input) => input.length > 0 || 'Select at least one tool.',
    },
    {
      type: 'confirm',
      name: 'hasUsedMcp',
      message: 'Have you set up MCP servers before?',
      default: false,
    },
  ]);
}

// ─── Prompt Template Installer ────────────────────────────────────────────

function copyPromptTemplates() {
  if (!fs.existsSync(PROMPTS_DIR)) fs.mkdirSync(PROMPTS_DIR, { recursive: true });

  const files = [
    'weekly-review.md',
    'campaign-audit.md',
    'seo-gap.md',
    'content-calendar.md',
    'channel-report.md',
  ];
  const results = { destDir: PROMPTS_DIR, copied: [], errors: [] };

  for (const file of files) {
    const src = path.join(__dirname, 'prompts', file);
    const dest = path.join(PROMPTS_DIR, file);
    try {
      if (!fs.existsSync(src)) {
        results.errors.push(`Missing template: ${file}`);
        continue;
      }
      fs.copyFileSync(src, dest);
      results.copied.push(file);
    } catch (err) {
      results.errors.push(`${file}: ${err.message}`);
    }
  }

  return results;
}

// ─── Summary ─────────────────────────────────────────────────────────────

function printSummary({ tools, configResult, promptResult, prereqResults, nextSteps, hasUsedMcp }) {
  console.log();
  console.log(chalk.bold("  Done. Here's what was configured:\n"));

  for (const toolId of tools) {
    const label = getLabel(toolId);
    const prereq = prereqResults[toolId];
    const integration = INTEGRATIONS[toolId];
    const configKey = integration?.configKey ?? toolId;
    const wasWritten = configResult.written.includes(configKey);

    let icon, note;
    if (integration?.prereq && !prereq?.ok) {
      icon = chalk.yellow('⚠ ');
      note = chalk.gray(`(needs ${prereq.what} — ${prereq.installUrl})`);
    } else if (!wasWritten) {
      icon = chalk.yellow('⏭ ');
      note = chalk.gray('(already in config, skipped)');
    } else {
      icon = chalk.green('✅');
      note = '';
    }

    console.log(`  ${icon} ${label} ${note}`);
  }

  console.log();
  console.log(`  ${chalk.blue('📁')} Prompt templates  → ${chalk.cyan(PROMPTS_DIR)}`);
  console.log(`  ${chalk.blue('📋')} Setup guide       → ${chalk.cyan(path.join(PROMPTS_DIR, 'SETUP-STATUS.md'))}`);
  console.log(`  ${chalk.blue('🧠')} Claude Project    → ${chalk.cyan(path.join(PROMPTS_DIR, 'CLAUDE-PROJECT.md'))}`);
  console.log(`  ${chalk.yellow('🔁')} Restart Claude Desktop to activate`);

  if (nextSteps.length > 0 && configResult.written.length > 0) {
    console.log();
    console.log(chalk.bold('  Next steps to finish setup:\n'));
    for (const { label, steps } of nextSteps) {
      console.log(chalk.bold.gray(`  ${label}:`));
      for (const step of steps) {
        console.log(chalk.gray(`    • ${step}`));
      }
      console.log();
    }
  }

  if (!hasUsedMcp) {
    console.log(chalk.gray('  Tip: drag SETUP-STATUS.md into Claude Desktop and say'));
    console.log(chalk.gray('  "Help me finish setup" to get guided through credentials.'));
    console.log();
  }
}

// ─── Setup Command ────────────────────────────────────────────────────────

async function setup() {
  showBanner();

  const { os: userOs, tools, hasUsedMcp } = await askQuestions();
  console.log();

  const prereqSpinner = ora('Checking prerequisites...').start();
  const prereqResults = await checkPrereqs(tools);
  prereqSpinner.stop();

  const missing = Object.values(prereqResults).filter((r) => !r.ok);
  if (missing.length > 0) {
    console.log();
    for (const r of missing) {
      console.log(chalk.yellow(`  ⚠  ${r.label} requires ${r.what}`));
      console.log(chalk.gray(`     Install: ${r.installUrl}`));
    }
    console.log(chalk.gray('\n  Continuing — config will still be written.'));
  }
  console.log();

  const configSpinner = ora('Writing Claude Desktop config...').start();
  let configResult = { written: [], skipped: [], backup: null };
  let configPath = '';
  try {
    configPath = getConfigPath(userOs);
    const mcpConfigs = buildConfigs(tools);
    configResult = writeConfig(configPath, mcpConfigs);
    const backupNote = configResult.backup ? chalk.gray(' (backup saved)') : '';
    configSpinner.succeed(`Config written → ${configPath}${backupNote}`);
  } catch (err) {
    configSpinner.fail(`Config write failed: ${err.message}`);
  }

  const promptSpinner = ora('Copying prompt templates...').start();
  let promptResult = { destDir: PROMPTS_DIR, copied: [], errors: [] };
  try {
    promptResult = copyPromptTemplates();
    promptSpinner.succeed(`Templates copied (${promptResult.copied.length} files)`);
  } catch (err) {
    promptSpinner.fail(`Template copy failed: ${err.message}`);
  }

  const statusSpinner = ora('Writing setup guides...').start();
  try {
    writeSetupStatus({ tools, prereqResults, configResult, configPath });
    writeClaudeProject({ tools, configPath });
    statusSpinner.succeed('Setup guides written');
  } catch (err) {
    statusSpinner.fail(`Guide generation failed: ${err.message}`);
  }

  printSummary({
    tools,
    configResult,
    promptResult,
    prereqResults,
    nextSteps: getNextSteps(tools),
    hasUsedMcp,
  });
}

// ─── Status Command ───────────────────────────────────────────────────────

async function status() {
  console.log();
  console.log(chalk.bold.magenta('  Meridian Status'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log();

  const configPath = getConfigPath(detectOs());
  const config = readConfig(configPath);
  const installedIds = new Set(getInstalledToolIds(config));
  const allIds = getAllToolIds();

  let issueCount = 0;
  const notInstalled = [];

  for (const toolId of allIds) {
    const integration = INTEGRATIONS[toolId];
    const label = integration.label.padEnd(28);

    if (!installedIds.has(toolId)) {
      notInstalled.push(toolId);
      continue;
    }

    const missingVars = (integration.requiredEnvVars || []).filter((v) => !process.env[v.key]);

    if (missingVars.length === 0) {
      console.log(`  ${chalk.green('✅')}  ${chalk.white(label)} ${chalk.green('configured')}`);
    } else {
      issueCount++;
      console.log(`  ${chalk.yellow('⚠ ')}  ${chalk.white(label)} ${chalk.yellow('needs credentials')}`);
      for (const v of missingVars) {
        console.log(chalk.gray(`         ${v.key} not set`));
      }
    }
  }

  if (notInstalled.length > 0) {
    console.log();
    for (const toolId of notInstalled) {
      const label = INTEGRATIONS[toolId].label.padEnd(28);
      console.log(chalk.gray(`  ─    ${label} not installed`));
    }
  }

  console.log();

  if (installedIds.size === 0) {
    console.log(chalk.gray('  Nothing installed yet.'));
    console.log(chalk.gray('  Run: npx meridian-marketing setup'));
  } else if (issueCount > 0) {
    console.log(chalk.yellow(`  ${issueCount} tool(s) need credentials.`));
    console.log(chalk.gray('  Run: npx meridian-marketing doctor'));
  } else {
    console.log(chalk.green('  All installed tools are configured.'));
    if (notInstalled.length > 0) {
      console.log(chalk.gray(`  Run: npx meridian-marketing add ${notInstalled[0]} to add more tools.`));
    }
  }

  console.log();
}

// ─── Add Command ──────────────────────────────────────────────────────────

async function add(toolIds) {
  const allIds = getAllToolIds();

  if (toolIds.length === 0) {
    console.log();
    console.log(chalk.bold('  Available tools:'));
    console.log();
    for (const id of allIds) {
      const integration = INTEGRATIONS[id];
      console.log(`    ${chalk.cyan(id.padEnd(12))} ${integration.label}`);
    }
    console.log();
    console.log('  Usage:   npx meridian-marketing add <tool>');
    console.log('  Example: npx meridian-marketing add notion slack');
    console.log();
    return;
  }

  const invalid = toolIds.filter((id) => !allIds.includes(id));
  if (invalid.length > 0) {
    console.log();
    console.log(chalk.red(`  Unknown tool(s): ${invalid.join(', ')}`));
    console.log(chalk.gray(`  Available: ${allIds.join(', ')}`));
    console.log();
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold.magenta(`  Adding ${toolIds.map(getLabel).join(', ')}...`));
  console.log();

  const prereqSpinner = ora('Checking prerequisites...').start();
  const prereqResults = await checkPrereqs(toolIds);
  prereqSpinner.stop();

  const configPath = getConfigPath(detectOs());
  const configSpinner = ora('Writing config...').start();
  let configResult = { written: [], skipped: [], backup: null };
  try {
    const mcpConfigs = buildConfigs(toolIds);
    configResult = writeConfig(configPath, mcpConfigs);
    const backupNote = configResult.backup ? chalk.gray(' (backup saved)') : '';
    configSpinner.succeed(`Config updated${backupNote}`);
  } catch (err) {
    configSpinner.fail(`Config write failed: ${err.message}`);
    process.exit(1);
  }

  console.log();
  for (const toolId of toolIds) {
    const integration = INTEGRATIONS[toolId];
    const prereq = prereqResults[toolId];
    const wasWritten = configResult.written.includes(integration.configKey);
    const wasSkipped = configResult.skipped.includes(integration.configKey);

    if (integration.prereq && !prereq?.ok) {
      console.log(
        `  ${chalk.yellow('⚠ ')} ${integration.label} — ${chalk.gray(`needs ${prereq.what}: ${prereq.installUrl}`)}`
      );
    } else if (wasSkipped) {
      console.log(`  ${chalk.yellow('⏭ ')} ${integration.label} — ${chalk.gray('already configured')}`);
    } else if (wasWritten) {
      console.log(`  ${chalk.green('✅')} ${integration.label} — added`);
    }
  }

  const newlyAdded = toolIds.filter((id) =>
    configResult.written.includes(INTEGRATIONS[id]?.configKey)
  );

  if (newlyAdded.length > 0) {
    const nextSteps = getNextSteps(newlyAdded);
    if (nextSteps.length > 0) {
      console.log();
      console.log(chalk.bold('  Next steps:\n'));
      for (const { label, steps } of nextSteps) {
        console.log(chalk.bold.gray(`  ${label}:`));
        for (const step of steps) {
          console.log(chalk.gray(`    • ${step}`));
        }
        console.log();
      }
    }

    // Regenerate guides with full installed tool list
    try {
      const updatedConfig = readConfig(configPath);
      const allInstalled = getInstalledToolIds(updatedConfig);
      const prereqsForAll = await checkPrereqs(allInstalled);
      const allConfigKeys = allInstalled.map((id) => INTEGRATIONS[id].configKey);
      writeSetupStatus({
        tools: allInstalled,
        prereqResults: prereqsForAll,
        configResult: { written: allConfigKeys, skipped: [] },
        configPath,
      });
      writeClaudeProject({ tools: allInstalled, configPath });
    } catch {
      // non-fatal
    }

    console.log(chalk.gray('  Restart Claude Desktop to activate.'));
    console.log();
  }
}

// ─── Doctor Command ───────────────────────────────────────────────────────

async function doctor(toolIds) {
  console.log();
  console.log(chalk.bold.magenta('  Meridian Doctor'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));

  const configPath = getConfigPath(detectOs());
  const config = readConfig(configPath);
  const installedIds = new Set(getInstalledToolIds(config));

  const toCheck =
    toolIds.length > 0
      ? toolIds.filter((id) => getAllToolIds().includes(id))
      : [...installedIds];

  if (toCheck.length === 0) {
    console.log();
    console.log(chalk.gray('  Nothing installed to check.'));
    console.log(chalk.gray('  Run: npx meridian-marketing setup'));
    console.log();
    return;
  }

  let totalIssues = 0;

  for (const toolId of toCheck) {
    const result = await runDoctorChecks(toolId);
    if (!result) continue;

    console.log();
    console.log(chalk.bold(`  ${result.label}`));

    for (const check of result.checks) {
      const icon = check.ok ? chalk.green('  ✅') : chalk.red('  ✗ ');
      const label = check.ok ? chalk.gray(check.label) : chalk.white(check.label);
      console.log(`${icon}  ${label}`);
      if (!check.ok) {
        totalIssues++;
        if (check.fix) {
          console.log(chalk.gray(`       → ${check.fix}`));
        }
      }
    }
  }

  console.log();
  if (totalIssues === 0) {
    console.log(chalk.green('  All checks passed.'));
  } else {
    console.log(chalk.yellow(`  ${totalIssues} issue(s) found. Fix the above and restart Claude Desktop.`));
  }
  console.log();
}

// ─── Help ─────────────────────────────────────────────────────────────────

function showHelp() {
  console.log(chalk.bold('\n  Meridian — Marketing intelligence for Claude Desktop'));
  console.log();
  console.log('  Commands:');
  console.log(`    ${chalk.cyan('setup')}              First-time install`);
  console.log(`    ${chalk.cyan('add <tool>')}         Add a tool without re-running setup`);
  console.log(`    ${chalk.cyan('status')}             See what\'s installed`);
  console.log(`    ${chalk.cyan('doctor')}             Check for missing credentials`);
  console.log(`    ${chalk.cyan('doctor <tool>')}      Check a specific tool`);
  console.log();
  console.log(`  Available tools: ${chalk.cyan(getAllToolIds().join(', '))}`);
  console.log();
  console.log('  Examples:');
  console.log('    npx meridian-marketing setup');
  console.log('    npx meridian-marketing add notion');
  console.log('    npx meridian-marketing add notion slack');
  console.log('    npx meridian-marketing status');
  console.log('    npx meridian-marketing doctor');
  console.log();
}

// ─── Entry Point ──────────────────────────────────────────────────────────

const command = process.argv[2];

const handlers = {
  setup: () => setup(),
  status: () => status(),
  add: () => add(process.argv.slice(3)),
  doctor: () => doctor(process.argv.slice(3)),
};

const handler = handlers[command];

if (handler) {
  handler().catch((err) => {
    console.error(chalk.red(`\n  Fatal: ${err.message}`));
    process.exit(1);
  });
} else {
  showHelp();
}
