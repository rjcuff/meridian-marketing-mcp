#!/usr/bin/env node
/**
 * cli.js
 *
 * The brain. Shows the banner, asks the setup questions, then orchestrates:
 *   installer.js  → prereq checks + config building
 *   config-writer.js → reads/merges/writes Claude Desktop config
 *   fs.copyFileSync → drops prompt templates into ~/meridian-prompts
 *
 * Run: npx meridian setup
 *      node src/cli.js setup
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

import { checkPrereqs, buildConfigs, getNextSteps, getLabel } from './installer.js';
import { getConfigPath, writeConfig } from './config-writer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

function copyPromptTemplates(platform) {
  const destDir = path.join(os.homedir(), 'meridian-prompts');

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = ['weekly-review.md', 'campaign-audit.md', 'seo-gap.md'];
  const results = { destDir, copied: [], errors: [] };

  for (const file of files) {
    const src = path.join(__dirname, 'prompts', file);
    const dest = path.join(destDir, file);

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
  console.log(chalk.bold('  Done. Here\'s what was configured:\n'));

  // Per-tool status
  for (const toolId of tools) {
    const label = getLabel(toolId);
    const prereq = prereqResults[toolId];
    const written = configResult.written.includes(
      toolId === 'ga4' ? 'google-analytics' : toolId === 'gsc' ? 'google-search-console' : toolId
    );
    const skipped = !written;

    let icon, note;
    if (!prereq.ok) {
      icon = chalk.yellow('⚠ ');
      note = chalk.gray(`(needs ${prereq.what} — ${prereq.installUrl})`);
    } else if (skipped) {
      icon = chalk.yellow('⏭ ');
      note = chalk.gray('(already in config, skipped)');
    } else {
      icon = chalk.green('✅');
      note = '';
    }

    console.log(`  ${icon} ${label} ${note}`);
  }

  console.log();
  console.log(`  ${chalk.blue('📁')} Prompt templates → ${chalk.cyan(promptResult.destDir)}`);
  console.log(`  ${chalk.yellow('🔁')} Restart Claude Desktop to activate`);

  // Post-install steps (only if something was actually written)
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

  // First-timer explanation
  if (!hasUsedMcp) {
    console.log(chalk.gray('  What just happened: Meridian added your marketing tools to Claude\'s'));
    console.log(chalk.gray('  config file. After restarting Claude Desktop, it will have live access'));
    console.log(chalk.gray('  to your data. Open a prompt template from ~/meridian-prompts to try it.'));
    console.log();
  }
}

// ─── Setup Command ────────────────────────────────────────────────────────

async function setup() {
  showBanner();

  const { os: userOs, tools, hasUsedMcp } = await askQuestions();
  console.log();

  // Step 1: Check prerequisites (parallel, never blocks)
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

  // Step 2: Write Claude Desktop config
  const configSpinner = ora('Writing Claude Desktop config...').start();
  let configResult = { written: [], skipped: [] };
  try {
    const configPath = getConfigPath(userOs);
    const mcpConfigs = buildConfigs(tools);
    configResult = writeConfig(configPath, mcpConfigs);
    configSpinner.succeed(`Config written → ${configPath}`);
  } catch (err) {
    configSpinner.fail(`Config write failed: ${err.message}`);
  }

  // Step 3: Copy prompt templates
  const promptSpinner = ora('Copying prompt templates...').start();
  let promptResult = { destDir: path.join(os.homedir(), 'meridian-prompts'), copied: [], errors: [] };
  try {
    promptResult = copyPromptTemplates(userOs);
    promptSpinner.succeed(`Templates copied (${promptResult.copied.length} files)`);
  } catch (err) {
    promptSpinner.fail(`Template copy failed: ${err.message}`);
  }

  // Step 4: Print summary
  printSummary({
    tools,
    configResult,
    promptResult,
    prereqResults,
    nextSteps: getNextSteps(tools),
    hasUsedMcp,
  });
}

// ─── Entry Point ─────────────────────────────────────────────────────────

const command = process.argv[2];

if (command === 'setup') {
  setup().catch((err) => {
    console.error(chalk.red(`\n  Fatal: ${err.message}`));
    process.exit(1);
  });
} else {
  console.log(chalk.bold('\n  Meridian — Marketing intelligence for Claude Desktop'));
  console.log('\n  Usage:');
  console.log('    npx meridian setup     Configure your marketing MCP servers');
  console.log();
}
