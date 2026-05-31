# Meridian

**Marketing intelligence for Claude Desktop.**

Meridian is a one-command installer that connects Claude Desktop to your marketing tools — GA4, Google Search Console, and HubSpot — and drops three ready-to-use prompt templates into your home directory.

```
npx meridian setup
```

That's it. Answer three questions. Restart Claude Desktop. Start asking your data questions.

---

## What it installs

| Tool | How | Requires |
|------|-----|---------|
| Google Analytics 4 | `uvx mcp-server-google-analytics` | [uv](https://docs.astral.sh/uv/getting-started/installation/), service account key |
| Google Search Console | `npx @ahonn/mcp-server-gsc` | Node.js, service account key |
| HubSpot | Remote SSE (`https://mcp.hubspot.com/sse`) | Browser auth on first connect |

Meridian writes the correct entries into Claude Desktop's `claude_desktop_config.json` without touching anything else already in that file.

---

## Prompt templates

After setup, you'll find three templates in `~/meridian-prompts/`:

**`weekly-review.md`**
Pull GA4 traffic, top GSC queries, and HubSpot pipeline activity into one markdown report. Run every Monday.

**`campaign-audit.md`**
Cross-reference channel traffic (GA4) with top search pages (GSC) and contact sources (HubSpot). Identify what's driving pipeline vs just traffic.

**`seo-gap.md`**
Find queries with high impressions and low CTR. Surface pages in positions 5–20 (quick wins). Get 5 specific content recommendations.

---

## Prerequisites

**For GA4 and Search Console:**
1. Create a Google Cloud service account
2. Grant it `Viewer` access to your GA4 property and Search Console site
3. Download the JSON key
4. Set environment variables:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   GA4_PROPERTY_ID=123456789
   GSC_SITE_URL=https://yourdomain.com
   ```

**For HubSpot:**
Claude Desktop will prompt for browser auth on first use. No setup needed.

---

## Adding a new integration

Open `src/installer.js` and add an entry to `INTEGRATIONS`:

```js
klaviyo: {
  label: 'Klaviyo',
  configKey: 'klaviyo',
  prereq: {
    command: 'uvx',
    what: 'uv (Python package manager)',
    installUrl: 'https://docs.astral.sh/uv/getting-started/installation/',
  },
  mcpConfig: () => ({
    command: 'uvx',
    args: ['mcp-server-klaviyo'],
    env: { KLAVIYO_API_KEY: process.env.KLAVIYO_API_KEY || '' },
  }),
  nextSteps: [
    'Set KLAVIYO_API_KEY to your private API key from Klaviyo → Account → API Keys',
  ],
},
```

Then add `{ name: 'Klaviyo', value: 'klaviyo' }` to the checkbox in `src/cli.js`. Done.

---

## Roadmap

**v1 (this)** — Installer. Connects GA4, GSC, HubSpot. Copies prompt templates.

**v2** — `npx meridian update` to add/remove tools without re-running setup. `npx meridian status` to verify all connections.

**v3** — Meridian Pro. Hosted version with team workspaces, shared prompt libraries, and scheduled reports.

---

## License

MIT
