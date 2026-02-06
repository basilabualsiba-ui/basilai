

# Query Management Page + Advanced Teaching System

## Overview

Create a dedicated **Query Management page** (`/assistant-manager`) where you can view, add, edit, and test all assistant queries. Plus upgrade the teaching system with **External AI integration** (via Lovable AI) to auto-generate queries when the assistant doesn't know something, and add support for **custom code filters/formatters** in query configs.

---

## What Gets Built

### 1. Query Manager Page (`/assistant-manager`)

A full page with tabs:

**Tab 1: Saved Queries** - View all queries grouped by category, with ability to:
- See trigger patterns, query config, output template
- Edit any field inline
- Delete queries
- Test queries live (run and see results)
- Toggle active/inactive

**Tab 2: Add New Query** - Interactive form:
- Pick a table from dropdown (populated from actual DB schema)
- See all columns for that table with types
- Build filters visually (column, operator, value/variable)
- Pick aggregation (sum, count, avg, max, min)
- Set group_by, order_by, limit
- Add joins to related tables
- Set trigger patterns (Arabic/English)
- Set output template with `{variable}` placeholders
- Choose output mode: "one-line answer" or "table view"
- Choose action type: "query (read)" or "input (write)"
- **Code mode**: Write custom filter or result formatter as JavaScript code that gets stored and executed
- Preview the query before saving

**Tab 3: Database Explorer** - Browse all tables:
- See all tables with column names, types, and row counts
- Sort tables by size (row count)
- Group by category (financial, gym, prayer, etc.)
- Click a table to see sample data
- See relationships between tables

**Tab 4: Pending Suggestions** - Review AI-suggested queries:
- Approve or reject
- Edit before approving

**Tab 5: Synonyms** - Manage word mappings:
- View all synonyms
- Add new synonym groups
- Delete synonyms

---

### 2. Enhanced Teaching Flow in Chat

When the assistant doesn't understand a question:

```text
User: "كم مرة رحت الجيم هالشهر"
Roz: ما فهمت هالسؤال 🤔

اختر:
[📝 علمني يدوي] [🤖 اسأل الذكاء] [⏭️ تخطي]
```

- **علمني يدوي**: Opens simplified inline teaching (pick table, column, operation)
- **اسأل الذكاء**: Calls external AI via edge function, AI analyzes the DB schema and generates the query config, then asks user to approve before saving
- **تخطي**: Skip

---

### 3. External AI Teaching (Edge Function)

New edge function `suggest-query` that:
1. Receives the user's question + full DB schema
2. Uses Lovable AI (gemini-3-flash-preview) to generate a query_config
3. Returns the suggested query for user approval
4. On approval, saves to `assistant_queries`

---

### 4. Custom Code Support in Queries

Add two optional fields to `assistant_queries`:

- `filter_code`: Custom JavaScript code for complex filtering that can't be expressed with simple operators (e.g., date ranges, cross-table logic)
- `result_code`: Custom JavaScript code for formatting results (e.g., calculate percentage, combine fields)

Example:
```json
{
  "filter_code": "return data.filter(row => row.amount > 100 && row.date === variables.today)",
  "result_code": "const total = data.reduce((s, r) => s + r.amount, 0); return `صرفت ${total} شيكل`"
}
```

---

### 5. Conversational Context + User Profile

- The assistant remembers the conversation context (last 10 messages) to handle follow-ups like "وهالاسبوع؟" after asking about today's spending
- Gather basic user stats from DB (total accounts, workout frequency, etc.) to answer general questions like "كيف حالي مع الرياضة"

---

## Database Changes

### Migration: Add columns to `assistant_queries`

```sql
ALTER TABLE public.assistant_queries 
ADD COLUMN IF NOT EXISTS output_mode TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'query',
ADD COLUMN IF NOT EXISTS filter_code TEXT,
ADD COLUMN IF NOT EXISTS result_code TEXT;
```

- `output_mode`: 'text' (one line) or 'table' (table view)
- `action_type`: 'query' (read data) or 'input' (write data)
- `filter_code`: Optional JS code for custom filtering
- `result_code`: Optional JS code for custom result formatting

---

## New Edge Function: `suggest-query`

Uses Lovable AI to analyze user question against DB schema and generate a query config:

```typescript
// supabase/functions/suggest-query/index.ts
// POST { question: string, schema: TableInfo[] }
// Returns { suggested_query: QueryConfig, explanation: string }
```

The AI receives the full table schema and the user's question, then returns a structured query config using tool calling.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/AssistantManager.tsx` | Main query management page |
| `src/components/assistant/QueryEditor.tsx` | Visual query builder form |
| `src/components/assistant/DatabaseExplorer.tsx` | Table/column browser |
| `src/components/assistant/QueryTester.tsx` | Test query and see results |
| `src/components/assistant/SynonymManager.tsx` | Manage word mappings |
| `src/components/assistant/PendingQueriesManager.tsx` | Review AI suggestions |
| `supabase/functions/suggest-query/index.ts` | AI query suggestion edge function |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/assistant-manager` route |
| `src/types/assistant.ts` | Add `output_mode`, `action_type`, `filter_code`, `result_code` to types |
| `src/services/LocalAssistant/index.ts` | Add conversational context, AI teaching flow, code execution |
| `src/services/LocalAssistant/QueryExecutor.ts` | Support `filter_code` and `result_code` execution |
| `src/services/LocalAssistant/ResponseFormatter.ts` | Support table output mode |
| `src/components/assistant/AssistantChat.tsx` | Add link to manager page in header |
| `src/components/assistant/AssistantMessage.tsx` | Support table rendering in messages |
| `src/hooks/useLocalAssistant.ts` | Add AI teaching functions |
| `supabase/config.toml` | Add `suggest-query` function config |
| Migration SQL | Add new columns to `assistant_queries` |

---

## Technical Details

### Query Editor Form Fields

The visual query builder will have:
1. **Table selector** - Dropdown of all public tables
2. **Columns selector** - Multi-select of columns (auto-populated from selected table)
3. **Joins** - Add related tables with foreign key detection
4. **Filters** - Add rows: column | operator (eq, gt, gte, lt, lte, like, ilike, not_null) | value or {variable}
5. **Aggregation** - Type (sum/count/avg/max/min) + column
6. **Group by** - Multi-select columns
7. **Order by** - Column + direction
8. **Limit** - Number input
9. **Trigger patterns** - Text array input
10. **Output template** - Text with {placeholder} support
11. **Output mode** - Radio: "One line" or "Table"
12. **Action type** - Radio: "Query (read)" or "Input (write)"
13. **Code mode toggle** - Switch to write custom filter_code or result_code

### Database Explorer

Fetches schema via `information_schema.columns` and shows:
- Table name, row count, columns with types
- Sortable by row count
- Grouped by detected category
- Click to see 5 sample rows

### AI Teaching Flow

1. User asks unknown question in chat
2. User clicks "اسأل الذكاء"
3. Frontend sends question + schema to `suggest-query` edge function
4. AI generates query config
5. User sees preview: "الذكاء يقترح: [query details]... موافق؟"
6. User approves -> saved to `assistant_queries`
7. Query immediately available

### Conversational Context

Store last query result + last 5 messages in memory. When user says follow-up like "وهالاسبوع؟", detect it's a modification of the last query and adjust the date filter.

### Code Execution Safety

`filter_code` and `result_code` are executed via `new Function()` with limited scope (only `data`, `variables`, `row` parameters). No access to DOM or external APIs.

---

## Implementation Order

1. Database migration (add columns)
2. Update types
3. Create edge function `suggest-query`
4. Build Database Explorer component
5. Build Query Editor form
6. Build Query Tester
7. Build Synonym Manager
8. Build Pending Queries Manager
9. Assemble AssistantManager page
10. Add route to App.tsx
11. Update LocalAssistant service with AI teaching + context + code execution
12. Update chat UI with AI teaching buttons and table rendering
13. Update config.toml

