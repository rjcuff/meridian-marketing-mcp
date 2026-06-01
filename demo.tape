Output demo.gif

Set Shell "bash"
Set FontSize 14
Set Width 110
Set Height 38
Set Theme "Dracula"
Set Padding 20
Set LoopOffset 50%
Set PlaybackSpeed 1

# ── Show what it is ──────────────────────────────────────────

Type "npx meridian-marketing"
Sleep 300ms
Enter
Sleep 3s

# ── Run setup ────────────────────────────────────────────────

Type "clear"
Enter
Sleep 300ms

Type "npx meridian-marketing setup"
Sleep 400ms
Enter
Sleep 2000ms

# OS — Mac is first option, press Enter to select
Enter
Sleep 900ms

# Tools — GA4 + GSC pre-checked, press Enter to accept
Enter
Sleep 900ms

# "Have you used MCP before?" — No (default), press Enter
Enter
Sleep 6000ms

# ── Check status ─────────────────────────────────────────────

Type "clear"
Enter
Sleep 300ms

Type "npx meridian-marketing status"
Sleep 400ms
Enter
Sleep 2500ms

# ── Run doctor ───────────────────────────────────────────────

Type "npx meridian-marketing doctor"
Sleep 400ms
Enter
Sleep 3000ms

# ── Add a new tool ───────────────────────────────────────────

Type "npx meridian-marketing add notion"
Sleep 400ms
Enter
Sleep 4000ms
