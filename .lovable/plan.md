

# "هل تقصد...؟" — Fuzzy Intent Suggestion + Learning

## Overview
When a user's query doesn't exactly match any intent but is *close* to one, the assistant will suggest: "هل تقصد: [closest question]?" with Yes/No chips. If the user confirms, the mapping is saved to `localStorage` so next time the same query auto-matches.

## Changes (single file: `AssistantBubble.tsx`)

### 1. Fuzzy Matching Function
Add a `findClosestIntent` function that runs when `matchIntent` returns null:
- Compare user text against all keywords using a similarity score (longest common substring / Levenshtein-like)
- Return the best match if similarity > 0.5 threshold
- Skip very short queries (< 3 chars)

### 2. Learned Aliases (localStorage)
```typescript
const LEARNED_KEY = "assistant_learned_aliases";
// Structure: { [userText]: intentId }
```
- On each query, check learned aliases BEFORE running `matchIntent`
- When user confirms a suggestion, save `{ userText → intentId }` to localStorage

### 3. Suggestion Flow
When no exact match but fuzzy match found:
- Show: `"هل تقصد: '{best keyword}'؟"` 
- Chips: `["✅ أيوا", "❌ لا"]`
- Store the pending suggestion in state
- On "أيوا": save to localStorage, execute the intent
- On "لا": show "ما فهمت سؤالك، جرب بطريقة ثانية 🤔"

### 4. Similarity Algorithm
Simple approach: for each keyword, compute overlap ratio using word intersection + character subsequence matching. This avoids heavy dependencies while handling Arabic text well.

```text
User: "كم المعدل بالفئات"  →  no exact match
Closest: "كم المعدل حسب الفئات" (similarity: 0.85)
→ "هل تقصد: 'كم المعدل حسب الفئات'؟"
→ User clicks ✅ → saved, next time auto-matches
```

