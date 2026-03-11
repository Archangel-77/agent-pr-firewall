# Launch Day Playbook (1-Day Blast)

This file is the execution checklist for the same-day launch.

## T-30 to T-10 (Preparation)

1. Confirm canonical links:
   - `https://github.com/Archangel-77/agent-pr-firewall`
   - `https://github.com/Archangel-77/agent-pr-firewall/releases/tag/v0.1.1`
   - `https://github.com/Archangel-77/agent-pr-firewall/pull/2`
2. Prepare 3 visuals:
   - PR page showing `agent-pr-firewall` check passing
   - server log showing webhook accepted and check created
   - `/metrics` response screenshot
3. Open `docs/launch-copy.md` and keep post text ready in one editor tab.

## T+0 to T+90 (Publishing Window)

1. T+0: publish X post.
2. T+15: publish Reddit post to `r/devops`.
3. T+30: publish Reddit post to `r/github`.
4. T+45: publish Hacker News Show HN.
5. T+60: publish Dev.to short article.
6. T+70: open 2 GitHub Discussions seed threads.

## T+90 to T+480 (Engagement Window)

1. Check each channel every 30-60 minutes.
2. Reply to meaningful comments with:
   - practical setup guidance
   - policy tuning examples
   - clear repo/release links
3. Ask interested users: `Which policy would you enable first?`
4. Capture all feedback in `docs/launch-results.md`.

## End of Day (T+480)

1. Publish one proof update (X or Reddit comment):
   - screenshot or link to passing checks PR
   - one metric (stars or discussion activity)
   - quick-start link
2. Summarize outcomes in `docs/launch-results.md`.
