# inobeta-ai-agent

Shared TypeScript library to build domain-specific AI agents with:

- pluggable model drivers
- reusable `AiAgent` execution flow
- persisted execution/suggestion tracking via Knex

## Requirements

- Node `>=24.8.0`
- npm (lockfile is `package-lock.json`)
- A PostgreSQL database with the schema in `src/ai-agent/schema.sql`

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Run Example

```bash
npm run example:task-priority
```

Requires `DATABASE_URL` and the schema already applied.

## Database schema and coherence check

The runtime in `src/ai-agent/ai-agent.ts` reads/writes these tables:

- `ai_agents`
- `ai_agent_executions`
- `ai_agent_suggestions`

`src/ai-agent/schema.sql` is coherent with current runtime behavior:

- `ai_agents.code` + `is_active` are used to resolve the agent before each run.
- `ai_agent_executions` supports insert-on-start and update-on-complete/fail (`status`, `model`, token counts, summaries, timings, error message).
- `ai_agent_suggestions` supports insert of validated suggestions with default `status = 'pending'`.

Notes:

- The extra table `ai_model_rates` in `schema.sql` is not used by current runtime code; it is safe but optional for core execution flow.
- `user_id` is `UUID` in SQL and treated as `string | null` in TypeScript, which is compatible.

## Quick usage

1. Apply `src/ai-agent/schema.sql` to your database.
2. Ensure an active row exists in `ai_agents` for your agent code.
3. Implement a subclass of `AiAgent<TInput, TSuggestion>`.
4. Provide a driver implementing `AiModelDriver` (built-in `ClaudeDriver` is exported).
5. Call `agent.run(input, userId, driver)`.

## Example

See `examples/task-priority-agent.ts` for a full working example that:

- defines a custom `TaskPriorityAgent`
- uses a deterministic `ExampleDriver`
- seeds `ai_agents` with `code = 'task-priority'`
- executes `run()` and persists results

Example guide: `examples/README.md`.
