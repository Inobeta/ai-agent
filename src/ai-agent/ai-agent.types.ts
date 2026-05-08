import type { Knex } from "knex";

// ============================================================
// Model Driver interfaces
// ============================================================

export interface ModelOptions {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
}

export interface ModelResponse {
    content: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
}

export interface AiModelDriver {
    complete(prompt: string, options?: ModelOptions): Promise<ModelResponse>;
    getDriverName(): string;
}

// ============================================================
// Agent execution types
// ============================================================

export interface AgentResult<TSuggestion> {
    executionId: number;
    suggestions: ValidatedSuggestion<TSuggestion>[];
    durationMs: number;
}

export interface ValidatedSuggestion<TSuggestion> {
    suggestionId: number;
    data: TSuggestion;
    confidence: number;
    reason: string;
}

// ============================================================
// Database row types
// ============================================================

export interface AiAgentRow {
    id: number;
    code: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export interface AiAgentExecutionRow {
    id: number;
    agent_id: number;
    user_id: string | null;
    driver: string;
    model: string;
    started_at: string;
    completed_at: string | null;
    duration_ms: number | null;
    status: "running" | "completed" | "failed";
    error_message: string | null;
    input_summary: Record<string, unknown> | null;
    output_summary: Record<string, unknown> | null;
    input_tokens: number | null;
    output_tokens: number | null;
    created_at: string;
}

export interface AiAgentSuggestionRow {
    id: number;
    execution_id: number;
    suggestion_data: Record<string, unknown>;
    confidence: number | null;
    reason: string | null;
    status: "pending" | "accepted" | "rejected";
    reviewed_at: string | null;
    created_at: string;
}