import type { Knex } from "knex";
import type {
    AiModelDriver,
    AgentResult,
    ValidatedSuggestion,
    ModelResponse,
    AiAgentRow,
} from "./ai-agent.types";

export abstract class AiAgent<TInput, TSuggestion> {
    constructor(
        protected readonly knex: Knex,
        protected readonly agentCode: string,
    ) { }

    async run(
        input: TInput,
        userId: string | null,
        driver: AiModelDriver,
    ): Promise<AgentResult<TSuggestion>> {
        const agent = await this.resolveAgent();
        const executionId = await this.createExecution(
            agent.id,
            userId,
            driver,
            input,
        );

        const startTime = Date.now();

        try {
            const context = await this.gatherContext(input);
            const prompt = this.buildPrompt(context);
            const modelResponse = await driver.complete(
                prompt,
                this.getModelOptions(),
            );
            const durationMs = Date.now() - startTime;
            const parsed = this.parseSuggestions(modelResponse.content);
            const validated = await this.validateSuggestions(parsed, context);
            const suggestions = await this.completeExecution(
                executionId,
                durationMs,
                validated,
                modelResponse,
                input,
            );

            return { executionId, suggestions, durationMs };
        } catch (error) {
            const durationMs = Date.now() - startTime;
            await this.failExecution(executionId, durationMs, error);
            throw error;
        }
    }

    // ---- Abstract methods (domain-specific) ----

    protected abstract gatherContext(input: TInput): Promise<unknown>;

    protected abstract buildPrompt(context: unknown): string;

    protected abstract parseSuggestions(rawContent: string): Array<{
        data: TSuggestion;
        confidence: number;
        reason: string;
    }>;

    protected abstract validateSuggestions(
        suggestions: Array<{
            data: TSuggestion;
            confidence: number;
            reason: string;
        }>,
        context: unknown,
    ): Promise<
        Array<{ data: TSuggestion; confidence: number; reason: string }>
    >;

    // ---- Overridable hooks ----

    protected getModelOptions(): { systemPrompt?: string; temperature?: number; maxTokens?: number } {
        return {};
    }

    protected buildInputSummary(_input: TInput): Record<string, unknown> | null {
        return null;
    }

    protected buildOutputSummary(
        _suggestions: ValidatedSuggestion<TSuggestion>[],
    ): Record<string, unknown> | null {
        return null;
    }

    // ---- Private framework methods ----

    private async resolveAgent(): Promise<AiAgentRow> {
        const agent = await this.knex("ai_agents")
            .where({ code: this.agentCode, is_active: true })
            .first<AiAgentRow>();

        if (!agent) {
            throw new Error(
                `AI agent "${this.agentCode}" not found or inactive`,
            );
        }

        return agent;
    }

    private async createExecution(
        agentId: number,
        userId: string | null,
        driver: AiModelDriver,
        input: TInput,
    ): Promise<number> {
        const [row] = await this.knex("ai_agent_executions")
            .insert({
                agent_id: agentId,
                user_id: userId,
                driver: driver.getDriverName(),
                model: "",
                started_at: new Date(),
                status: "running",
                input_summary: JSON.stringify(
                    this.buildInputSummary(input),
                ),
            })
            .returning("id");

        return row.id;
    }

    private async completeExecution(
        executionId: number,
        durationMs: number,
        validated: Array<{
            data: TSuggestion;
            confidence: number;
            reason: string;
        }>,
        modelResponse: ModelResponse,
        input: TInput,
    ): Promise<ValidatedSuggestion<TSuggestion>[]> {
        const suggestionRows = validated.map((s) => ({
            execution_id: executionId,
            suggestion_data: JSON.stringify(s.data),
            confidence: s.confidence,
            reason: s.reason,
            status: "pending" as const,
        }));

        let insertedIds: Array<{ id: number }> = [];
        if (suggestionRows.length > 0) {
            insertedIds = await this.knex("ai_agent_suggestions")
                .insert(suggestionRows)
                .returning("id");
        }

        const suggestions: ValidatedSuggestion<TSuggestion>[] =
            validated.map((s, i) => ({
                suggestionId: insertedIds[i]?.id ?? 0,
                data: s.data,
                confidence: s.confidence,
                reason: s.reason,
            }));

        const outputSummary = this.buildOutputSummary(suggestions);

        await this.knex("ai_agent_executions")
            .where({ id: executionId })
            .update({
                completed_at: new Date(),
                duration_ms: durationMs,
                status: "completed",
                model: modelResponse.model,
                input_tokens: modelResponse.inputTokens,
                output_tokens: modelResponse.outputTokens,
                output_summary: JSON.stringify(outputSummary),
            });

        return suggestions;
    }

    private async failExecution(
        executionId: number,
        durationMs: number,
        error: unknown,
    ): Promise<void> {
        const message =
            error instanceof Error ? error.message : String(error);

        await this.knex("ai_agent_executions")
            .where({ id: executionId })
            .update({
                completed_at: new Date(),
                duration_ms: durationMs,
                status: "failed",
                error_message: message,
            });
    }
}