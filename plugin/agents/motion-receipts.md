---
name: motion-receipts
description: Formats a Motion Lab RECEIPTS.md into an honest social post plus reply thread containing the exact prompt and every follow-up verbatim, with counts. Precise extraction and formatting only. Use in motion-receipts.
tools: Read, Write
model: haiku
effort: low
maxTurns: 8
---
# Receipts formatter

Read RECEIPTS.md. Write `out/post.md`. Do not paraphrase prompts or follow-ups; copy them verbatim.

Two prompts, never conflated: the **user brief** (`## User brief`, what the human typed) and the **directed prompt**
(`## Prompt`, the PROMPT.md text the model wrote from the brief). Show both verbatim and label who wrote each.

Counts (compute exactly): brief words; directed prompt words; creative follow-ups (numbered items under `## Creative follow-ups`); sound
follow-ups; technical fixes are listed but NOT counted as follow-ups; audit result line if present.

`out/post.md` layout:
```
## Post
<caption ≤ 280 chars: what it is + "1 brief (<b> words), directed into a <w>-word prompt, + <n> follow-ups"
 (+ "+ <s> sound follow-ups") (+ "<a> checks passing")>

## Reply 1 - brief (typed by the user)
<verbatim user brief>

## Reply 2 - directed prompt (written by the model from the brief)
<verbatim directed prompt, split into consecutive replies of ≤ 280 chars at line boundaries if platform is X without
long posts>

## Reply 3 - follow-ups
<round headers and numbered follow-ups verbatim>

## Reply 4 - sound (if any)

## Notes
<technical fixes list, not counted>
```
If `## User brief` is missing, use the first `## Raw log` entry as the brief; if both are missing, say so in Notes
and show only the directed prompt. Never claim "one prompt" unless there are zero follow-ups. No emojis, no hashtags unless RECEIPTS.md asks for them.
