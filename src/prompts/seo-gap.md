# SEO Content Gap Finder

Use this prompt to find your fastest SEO wins and highest-value content opportunities.
Run monthly or whenever planning new content.

---

## Prompt

Please analyze my Google Search Console data to identify SEO content gaps and quick win opportunities.

### 1. High Impressions, Low CTR — Wasted Visibility
- Find all queries with more than 500 impressions in the last 28 days AND a CTR below 3%
- Sort by impressions descending
- For each query: show impressions, CTR, average position, and the URL currently ranking
- These are queries where people are seeing me but not clicking — I'm missing easy traffic

### 2. Position 5–20 Quick Wins
- Find all queries where my average position is between 5 and 20
- Filter to queries with at least 100 impressions
- Sort by impressions descending (highest opportunity first)
- For each: query, current position, impressions, clicks, CTR, ranking URL
- These are the queries closest to page 1 — a small push moves the needle

### 3. Cannibalization Check
- Are there any queries where 2+ of my pages are ranking?
- List them: query, pages competing, their respective positions
- Cannibalization splits authority and hurts both pages

### 4. Content Gap Analysis
- Based on the high-impression / low-CTR queries and position 5–20 keywords:
  - Group them by topic or theme
  - Identify which topics I'm underserving
  - Flag any topics where I have no page ranking at all (pure gap)

### 5. Content Recommendations
Give me exactly 5 content pieces I should create or improve, ranked by expected impact.

For each piece:
- **Title**: A specific working title for the page or post
- **Target keyword**: The primary query to optimize for
- **Why**: One sentence on the opportunity (impressions, gap, cannibalization fix, etc.)
- **Action**: Create new page / Update existing page [URL] / Merge [URL1] and [URL2]
- **Success metric**: How I'll know it worked (e.g., "position moves from 14 to top 5 for [query]")

### Output Format
Use markdown tables for the data sections. Use a numbered list for the 5 recommendations.
Keep insights tight — one sentence per observation.
