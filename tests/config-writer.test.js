import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeConfig, getConfigPath } from '../src/config-writer.js';

// Use a real temp dir so we're testing actual file I/O, not mocks
let tmpDir;

describe('getConfigPath', () => {
  test('returns mac path under Library/Application Support', () => {
    const p = getConfigPath('mac');
    assert.ok(p.includes('Application Support'), `expected Application Support in: ${p}`);
    assert.ok(p.endsWith('claude_desktop_config.json'));
  });

  test('returns windows path under AppData/Roaming', () => {
    const p = getConfigPath('windows');
    assert.ok(
      p.toLowerCase().includes('appdata') || p.toLowerCase().includes('roaming'),
      `expected AppData/Roaming in: ${p}`
    );
    assert.ok(p.endsWith('claude_desktop_config.json'));
  });
});

describe('writeConfig — new file', () => {
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-test-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates the file if it does not exist', () => {
    const configPath = path.join(tmpDir, 'new', 'claude_desktop_config.json');
    const servers = { 'test-server': { command: 'npx', args: ['test'] } };

    writeConfig(configPath, servers);

    assert.ok(fs.existsSync(configPath), 'config file should be created');
    const written = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.deepEqual(written.mcpServers['test-server'], servers['test-server']);
  });

  test('reports the new server in written[]', () => {
    const configPath = path.join(tmpDir, 'fresh', 'claude_desktop_config.json');
    const result = writeConfig(configPath, { ga4: { command: 'uvx', args: [] } });

    assert.deepEqual(result.written, ['ga4']);
    assert.deepEqual(result.skipped, []);
  });
});

describe('writeConfig — existing file', () => {
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-test-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('merges new servers without touching existing ones', () => {
    const configPath = path.join(tmpDir, 'claude_desktop_config.json');

    // Existing config with an unrelated server
    const existing = {
      mcpServers: {
        'some-other-server': { command: 'python', args: ['-m', 'thing'] },
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(existing));

    writeConfig(configPath, { hubspot: { type: 'sse', url: 'https://mcp.hubspot.com/sse' } });

    const result = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // Original server still there
    assert.ok(result.mcpServers['some-other-server'], 'existing server should survive merge');
    // New server added
    assert.ok(result.mcpServers['hubspot'], 'new server should be added');
  });

  test('does not overwrite an already-configured server', () => {
    const configPath = path.join(tmpDir, 'existing_server_config.json');

    const original = { command: 'uvx', args: ['old-version'] };
    fs.writeFileSync(
      configPath,
      JSON.stringify({ mcpServers: { ga4: original } })
    );

    const result = writeConfig(configPath, { ga4: { command: 'uvx', args: ['new-version'] } });

    assert.deepEqual(result.skipped, ['ga4'], 'should report ga4 as skipped');
    assert.deepEqual(result.written, [], 'nothing should be written');

    const onDisk = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.deepEqual(onDisk.mcpServers.ga4.args, ['old-version'], 'original config should be unchanged');
  });

  test('handles malformed JSON gracefully', () => {
    const configPath = path.join(tmpDir, 'broken.json');
    fs.writeFileSync(configPath, '{ this is not json }');

    // Should not throw — falls back to empty config
    assert.doesNotThrow(() => {
      writeConfig(configPath, { test: { command: 'npx', args: [] } });
    });

    const result = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.ok(result.mcpServers.test);
  });
});
