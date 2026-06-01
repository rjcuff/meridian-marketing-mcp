Output demo.gif

Set Shell "bash"
Set FontSize 14
Set Width 1200
Set Height 800
Set Theme "Dracula"
Set Padding 20
Set LoopOffset 50%
Set PlaybackSpeed 1

# ── Bootstrap local CLI so there's no npx download delay ─────────────────

Hide
Type "source /Users/ryancuff/Desktop/mcp/meridian-marketing-mcp/.demo-setup.sh"
Enter
Sleep 200ms
Type "clear"
Enter
Sleep 300ms
Show

# ── Show what it is ───────────────────────────────────────────────────────

Type "npx meridian-marketing"
Enter
Sleep 3s

# ── Run setup ─────────────────────────────────────────────────────────────

Type "clear"
Enter
Sleep 300ms

Type "npx meridian-marketing setup"
Enter
Sleep 2s

# OS — Mac is first option, already highlighted, press Enter to select
Enter
Sleep 700ms

# Tools — GA4 + GSC are pre-checked, press Enter to accept
Enter
Sleep 700ms

# "Have you set up MCP servers before?" — No (default), press Enter
Enter
Sleep 8s

# ── Check status ──────────────────────────────────────────────────────────

Type "clear"
Enter
Sleep 300ms

Type "npx meridian-marketing status"
Enter
Sleep 3s

# ── Run doctor ────────────────────────────────────────────────────────────

Type "npx meridian-marketing doctor"
Enter
Sleep 4s

# ── Add a new tool ────────────────────────────────────────────────────────

Type "npx meridian-marketing add notion"
Enter
Sleep 5s
