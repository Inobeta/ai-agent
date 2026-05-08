# Examples

This folder contains a minimal custom agent example based on the library runtime contract.

## Files

- `task-priority-agent.ts`: end-to-end demo with:
  - custom `AiAgent` subclass
  - simple `AiModelDriver` implementation (`ExampleDriver`)
  - seed of `ai_agents` row
  - `run()` execution with persisted execution/suggestions rows

## Run

1. Apply schema: `schema.sql` to your PostgreSQL database.
2. Set `DATABASE_URL`.
3. Build the library:

```bash
npm run build
```

4. Run the example:

```bash
npm run example:task-priority
```

The example writes rows to:

- `ai_agent_executions`
- `ai_agent_suggestions`
