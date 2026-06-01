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

Type "node src/cli.js"
Sleep 300ms
Enter
Sleep 3s

# ── Run setup ────────────────────────────────────────────────

Type "clear"
Enter
Sleep 300ms

Type "node src/cli.js setup"
Sleep 400ms
Enter
Sleep 1500ms

# OS — Mac is first option, press Enter
Enter
Sleep 900ms

# Tools — GA4 + GSC pre-checked, press Enter to accept
Enter
Sleep 900ms

# "Have you used MCP before?" — No
Enter
Sleep 5000ms

# ── Check status ─────────────────────────────────────────────

Type "clear"
Enter
Sleep 300ms

Type "node src/cli.js status"
Sleep 400ms
Enter
Sleep 2500ms

# ── Run doctor ───────────────────────────────────────────────

Type "node src/cli.js doctor"
Sleep 400ms
Enter
Sleep 3000ms

# ── Add a new tool ───────────────────────────────────────────

Type "node src/cli.js add notion"
Sleep 400ms
Enter
Sleep 4000ms
