# Campaign Performance Audit

Use this prompt in Claude Desktop to audit how your marketing channels are performing together.
Best run monthly or before/after a campaign launch.

---

## Prompt

Please run a full campaign performance audit using data from GA4, Google Search Console, and HubSpot. I want to understand how my channels work together and where to focus next.

### 1. Channel Traffic Breakdown (GA4)
- Sessions broken down by channel: Organic Search, Direct, Referral, Paid, Email, Social
- Week-over-week or month-over-month change per channel
- Which channel has the highest engagement rate (session duration / pages per session)
- Which channel has the worst bounce rate

### 2. Top Landing Pages — Search vs Reality (GSC + GA4)
- Pull top 10 pages by GSC impressions
- For each page: impressions, clicks, CTR, average position (from GSC)
- Cross-reference with GA4: actual sessions, bounce rate, goal completions (if available)
- Flag pages with high impressions but low CTR (wasted visibility)
- Flag pages with high GSC traffic but high bounce rate (traffic-to-value mismatch)

### 3. HubSpot Contact Source Alignment
- Show breakdown of new contacts by original source this period
- Which source brings in the most contacts?
- Which source has the highest deal-to-contact conversion rate?
- Are there channels driving GA4 traffic but NOT showing up as HubSpot contact sources?

### 4. Cross-Channel Gaps
- Where are the biggest disconnects between traffic, visibility, and leads?
- Are there high-visibility pages (top GSC impressions) with zero HubSpot conversions?

### 5. Recommendations
Based on everything above, give me exactly 3 concrete actions I should take.
For each action: what to do, why it matters, and how to measure success.
Be specific — not "improve content" but "rewrite the H1 and meta description on [page] because..."

### Output Format
Use markdown with tables for data, bullets for insights, and a numbered list for recommendations.
