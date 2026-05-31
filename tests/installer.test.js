import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildConfigs, getLabel, getNextSteps } from '../src/installer.js';

describe('buildConfigs', () => {
  test('ga4 config has correct command and args', () => {
    const configs = buildConfigs(['ga4']);
    const ga4 = configs['google-analytics'];

    assert.ok(ga4, 'should have google-analytics key');
    assert.equal(ga4.command, 'uvx');
    assert.deepEqual(ga4.args, ['mcp-server-google-analytics']);
    assert.ok('GOOGLE_APPLICATION_CREDENTIALS' in ga4.env);
  });

  test('gsc config uses npx with correct package', () => {
    const configs = buildConfigs(['gsc']);
    const gsc = configs['google-search-console'];

    assert.ok(gsc);
    assert.equal(gsc.command, 'npx');
    assert.ok(gsc.args.includes('@ahonn/mcp-server-gsc'));
    // -y flag skips the "ok to install?" prompt
    assert.ok(gsc.args.includes('-y'), 'npx call should include -y to suppress prompts');
  });

  test('hubspot config is remote SSE, no command', () => {
    const configs = buildConfigs(['hubspot']);
    const hs = configs['hubspot'];

    assert.ok(hs);
    assert.equal(hs.type, 'sse');
    assert.ok(hs.url.startsWith('https://'), 'HubSpot URL should be https');
    assert.equal(hs.command, undefined, 'remote SSE should not have a local command');
  });

  test('multiple tools produce multiple config keys', () => {
    const configs = buildConfigs(['ga4', 'gsc', 'hubspot']);
    assert.equal(Object.keys(configs).length, 3);
  });

  test('unknown tool ID is ignored, does not throw', () => {
    assert.doesNotThrow(() => buildConfigs(['nonexistent']));
    const configs = buildConfigs(['nonexistent']);
    assert.equal(Object.keys(configs).length, 0);
  });

  test('empty selection returns empty object', () => {
    const configs = buildConfigs([]);
    assert.deepEqual(configs, {});
  });
});

describe('getLabel', () => {
  test('returns human-readable label for known tools', () => {
    assert.equal(getLabel('ga4'), 'Google Analytics 4');
    assert.equal(getLabel('gsc'), 'Google Search Console');
    assert.equal(getLabel('hubspot'), 'HubSpot');
  });

  test('returns the raw ID for unknown tools instead of crashing', () => {
    assert.equal(getLabel('mystery-tool'), 'mystery-tool');
  });
});

describe('getNextSteps', () => {
  test('GA4 and GSC include GOOGLE_APPLICATION_CREDENTIALS instructions', () => {
    const steps = getNextSteps(['ga4', 'gsc']);
    const allStepText = steps.flatMap((s) => s.steps).join('\n');

    assert.ok(
      allStepText.includes('GOOGLE_APPLICATION_CREDENTIALS'),
      'should mention env var setup for Google tools'
    );
  });

  test('HubSpot steps mention browser auth, not service account', () => {
    const steps = getNextSteps(['hubspot']);
    const allStepText = steps.flatMap((s) => s.steps).join('\n').toLowerCase();

    // HubSpot should NOT require service account setup
    assert.ok(!allStepText.includes('service account'), 'HubSpot should not require service account');
    assert.ok(allStepText.includes('hubspot'), 'should reference HubSpot');
  });

  test('returns empty array for empty selection', () => {
    assert.deepEqual(getNextSteps([]), []);
  });

  test('each entry has label and non-empty steps array', () => {
    const steps = getNextSteps(['ga4', 'gsc', 'hubspot']);
    for (const entry of steps) {
      assert.ok(entry.label, 'entry should have a label');
      assert.ok(Array.isArray(entry.steps), 'entry.steps should be an array');
      assert.ok(entry.steps.length > 0, `${entry.label} should have at least one step`);
    }
  });
});
