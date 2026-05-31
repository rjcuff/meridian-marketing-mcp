# Weekly Marketing Review

Use this prompt in Claude Desktop after configuring Meridian.
Paste it directly into Claude — it will pull live data from your connected tools.

---

## Prompt

Please run my weekly marketing review. Pull live data from my connected tools and produce a clean markdown report covering the following:

### 1. GA4 Traffic Summary
- Total sessions this week vs the same 7-day period last week
- % change in users, sessions, and bounce rate
- Top 5 landing pages by sessions this week
- Any notable traffic spikes or drops worth flagging

### 2. Google Search Console — Top Queries
- Top 5 queries by clicks this week
- For each query: clicks, impressions, average CTR, average position
- Flag any queries where position dropped more than 3 spots week-over-week

### 3. HubSpot Pipeline Activity
- List any deals that changed stage this week (name, old stage → new stage, deal value)
- New deals created this week (count + total value)
- Deals closed won or lost (list them with amounts)

### 4. Attention Items
- Summarize anything that needs my attention or follow-up
- Flag anything unusual, declining, or at risk
- Use bullet points, not paragraphs

### Output Format
Present everything as a clean markdown report with clear section headers.
Keep it scannable — use tables where data fits, bullets elsewhere.
End with a "3 priorities for next week" section based on what you found.
