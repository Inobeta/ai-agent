# @inobeta/ai-agent

A TypeScript framework for building domain-specific AI agents in business applications.

Instead of wiring LLM calls ad hoc in your services, you define a typed agent subclass that handles one business problem. The framework owns the execution lifecycle: persisting runs, tracking token usage, storing suggestions, and handling failures — so your subclass focuses only on domain logic.

---

## The problem it solves

Most AI integrations in business applications end up as unstructured glue code: a `fetch()` to an LLM API somewhere in a service, response parsed inline, no audit trail, no retry logic, no way to review what the model suggested before it affects data.

This framework enforces a consistent structure via the **Template Method pattern**: the abstract `AiAgent<TInput, TSuggestion>` class defines the execution flow, and each concrete agent implements only the domain-specific steps.

```
gatherContext() → buildPrompt() → driver.complete() → parseSuggestions() → validateSuggestions()
                                                              ↓
                                               persisted in ai_agent_suggestions (status: pending)
```

Every run is persisted in PostgreSQL: inputs, outputs, token counts, duration, status. Suggestions stay in a `pending` state until your application accepts or rejects them — the model never writes directly to your business data.

---

## When to use this

- You have a **recurring business decision** that can be modeled as: "given this context, suggest these actions"
- You want an **audit trail** of every AI interaction without building the persistence layer yourself
- You need to swap AI providers (Claude today, OpenAI tomorrow) without touching business logic
- Your team wants to **review suggestions before applying them**, not have the model act directly

## When NOT to use this

- Simple one-off LLM calls with no persistence requirement — this adds overhead you don't need
- Streaming responses — the current driver interface returns a complete `ModelResponse`
- Agentic loops where the model calls tools autonomously — this is a single-turn request/response pattern

---

## Install

```bash
npm install @inobeta/ai-agent
```

Peer dependency: `knex ^2.3.0`. You provide the Knex instance configured for your PostgreSQL database.

---

## Database setup

Apply the schema before first use:

```bash
psql $DATABASE_URL -f node_modules/@inobeta/ai-agent/schema.sql
```

This creates three tables:

| Table | Purpose |
|---|---|
| `ai_agents` | Registry of active agents, keyed by `code` |
| `ai_agent_executions` | One row per `agent.run()` call — status, timing, token counts |
| `ai_agent_suggestions` | Suggestions produced by each execution — default `status: pending` |

You also need one row in `ai_agents` for each agent you deploy:

```sql
INSERT INTO ai_agents (code, description, is_active)
VALUES ('my-agent-code', 'What this agent does', true);
```

---

## Quick start

### 1. Define your agent

```typescript
import { AiAgent } from '@inobeta/ai-agent';

interface InvoiceInput {
  invoiceId: number;
}

interface CategorizationSuggestion {
  categoryCode: string;
  accountCode: string;
}

class InvoiceCategorizationAgent extends AiAgent<InvoiceInput, CategorizationSuggestion> {
  constructor(knex: Knex) {
    super(knex, 'invoice-categorization'); // matches ai_agents.code
  }

  protected async gatherContext(input: InvoiceInput) {
    // fetch invoice + vendor history from your DB
    return this.knex('invoices')
      .join('vendors', 'invoices.vendor_id', 'vendors.id')
      .where('invoices.id', input.invoiceId)
      .first();
  }

  protected buildPrompt(context: unknown): string {
    const invoice = context as any;
    return `
      Categorize this invoice for accounting:
      Vendor: ${invoice.vendor_name}
      Amount: ${invoice.amount}
      Description: ${invoice.description}
      
      Respond with a JSON array of suggestions:
      [{"categoryCode": "...", "accountCode": "...", "confidence": 0.95, "reason": "..."}]
    `;
  }

  protected parseSuggestions(rawContent: string) {
    return JSON.parse(rawContent) as Array<{
      data: CategorizationSuggestion;
      confidence: number;
      reason: string;
    }>;
  }

  protected async validateSuggestions(suggestions: any[], _context: unknown) {
    // filter out low-confidence suggestions, validate codes against your chart of accounts, etc.
    return suggestions.filter(s => s.confidence >= 0.7);
  }

  protected getModelOptions() {
    return {
      systemPrompt: 'You are an accounting assistant. Respond only with valid JSON.',
      temperature: 0.1,
    };
  }
}
```

### 2. Run it

```typescript
import { ClaudeDriver } from '@inobeta/ai-agent';
import knex from 'knex';

const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });

const driver = new ClaudeDriver({ apiKey: process.env.ANTHROPIC_API_KEY! });
const agent = new InvoiceCategorizationAgent(db);

const result = await agent.run({ invoiceId: 42 }, userId, driver);

console.log(result.executionId);   // persisted execution ID
console.log(result.suggestions);   // typed suggestions, status: pending in DB
console.log(result.durationMs);    // wall time including DB roundtrips
```

---

## Real-world example

The `examples/` folder contains a `TaskPriorityAgent` — a self-contained demo with:
- A concrete `AiAgent` subclass
- A deterministic `ExampleDriver` (no API key needed)
- DB seed for the `ai_agents` row
- End-to-end `run()` with persisted results

```bash
# apply schema, set DATABASE_URL, then:
npm run example:task-priority
```

The framework was originally built for a bank reconciliation agent (`CashFlowMatcherAgent`) that matches incoming bank movements to expected cash flows in a financial management application. That agent processes batches of unmatched transactions, asks Claude to suggest matches with confidence scores, and surfaces them in a bulk-review UI before any association is written to the database.

---

## Driver abstraction

Implement `AiModelDriver` to add any provider:

```typescript
export interface AiModelDriver {
  complete(prompt: string, options?: ModelOptions): Promise<ModelResponse>;
  getDriverName(): string;
}
```

`ClaudeDriver` is included. An OpenAI driver follows the same interface — 20 lines of code.

---

## Status

Used in production at [Inobeta](https://inobeta.it) in [Kaiboard](https://kaiboard.it), a business management application.

- [x] `ClaudeDriver` (Anthropic)
- [ ] `OpenAiDriver` (planned)

MIT License.
