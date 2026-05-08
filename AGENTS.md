# AGENTS.md
## Repo Shape
- This is a single-package CommonJS TypeScript library, not a monorepo.
- Public exports start at `src/index.ts`, which re-exports `src/ai-agent`.
- Published package output is `dist/index.js` and `dist/index.d.ts`; `dist/` is build output and ignored.
## Commands
- `npm run build` runs `tsc -p tsconfig.json`.
- `npm run clean` removes `dist/`.
- `npm run prepublishOnly` runs `npm run clean && npm run build`.
- There are currently no configured `test`, `lint`, or formatter scripts.
- `package-lock.json` is present; use npm.
## Runtime Contracts
- `AiAgent.run()` records execution state with Knex tables named `ai_agents`, `ai_agent_executions`, and `ai_agent_suggestions`.
- Database migrations/schema are not in this repo; consumers must provide compatible tables.
- `ClaudeDriver` depends on global `fetch`, matching the package `engines.node >=24.8.0`.
## Driver Registry
- The only built-in driver is `claude`.
- The default Claude model appears in both `src/ai-agent/driver.registry.ts` and `src/ai-agent/drivers/claude.driver.ts`; keep them aligned when changing model IDs.
