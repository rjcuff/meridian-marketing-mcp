# Meridian

Meridian connects Claude Desktop to your marketing data. Run one command, answer three questions, and Claude will have live access to Google Analytics, Google Search Console, and HubSpot. No config files to edit by hand. No reading documentation for four different tools. It just works.

```
npx meridian-marketing setup
```

## What this actually does

Most marketers who want to use Claude with their data hit the same wall. The official MCP servers exist, but setting them up requires editing a JSON config file, installing the right package manager, finding your property ID, setting environment variables, and hoping nothing breaks when you restart Claude Desktop. That is not a reasonable ask for someone who just wants to ask questions about their traffic.

Meridian handles all of that. It asks you which tools you use, checks that the right software is installed on your machine, writes the correct configuration into Claude Desktop's config file without touching anything else, and copies three ready-to-use prompt templates into a folder on your computer.

After you restart Claude Desktop, you can open one of those templates and immediately start getting answers from your actual marketing data.

## What gets installed

**Google Analytics 4** connects through Google's official MCP server, which runs locally using a tool called `uv`. You will need a Google Cloud service account with Viewer access to your property, and a JSON key file from that account.

**Google Search Console** connects through a community-built MCP server that runs with Node.js. It uses the same service account credentials as GA4, so if you set up one you are mostly set up for both.

**HubSpot** connects through HubSpot's official remote MCP endpoint. There is nothing to install locally. The first time Claude tries to connect it will open a browser window and ask you to authorize your HubSpot account.

Meridian writes these into `claude_desktop_config.json` as a merge, not an overwrite. Anything you already have configured stays exactly as it is.

## Prompt templates

After setup you will find three files in a `meridian-prompts` folder in your home directory. These are plain markdown files you can paste directly into Claude.

**weekly-review.md** pulls together your GA4 traffic numbers, top search queries from Search Console, and any HubSpot deals that moved this week, and asks Claude to write it up as a report. Intended to run every Monday morning and take about thirty seconds.

**campaign-audit.md** cross-references traffic by channel from GA4 with your top pages in Search Console and your contact source data from HubSpot. It is designed to answer the question of whether the traffic you are getting is actually turning into leads, and where the gaps are.

**seo-gap.md** finds search queries where your pages are showing up in Google but people are not clicking. It pulls out anything ranking between position 5 and 20, which are the keywords closest to page one, and asks Claude to suggest five specific pieces of content to write based on what it finds.

## Prerequisites

For GA4 and Search Console you need to do a one-time Google Cloud setup. Create a service account, give it Viewer access to your GA4 property and your Search Console site, download the JSON key file, and then set three environment variables in your shell profile.

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/key.json
GA4_PROPERTY_ID=123456789
GSC_SITE_URL=https://yourdomain.com
```

For HubSpot there is nothing to configure in advance. Just make sure you have a HubSpot account and can log in to it from your browser.

## Adding a new integration

The project is designed to be extended. Each marketing tool is a self-contained entry in `src/installer.js`. To add support for a new tool, add an object to the `INTEGRATIONS` registry with a label, a config key, the prerequisites it needs, the MCP config to write, and a list of setup instructions to show after install. Then add the tool as a checkbox option in `src/cli.js`. Nothing else needs to change.

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
    'Set KLAVIYO_API_KEY to your private API key from the Klaviyo account settings.',
  ],
},
```

## License

MIT. See the LICENSE file for details.
