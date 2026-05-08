import type {
    AiModelDriver,
    ModelOptions,
    ModelResponse,
} from "../ai-agent.types";

export interface ClaudeDriverOptions {
    apiKey: string;
    defaultModel?: string;
    baseUrl?: string;
}

interface ClaudeApiResponse {
    content: Array<{ type: string; text?: string }>;
    model: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

export class ClaudeDriver implements AiModelDriver {
    private readonly apiKey: string;
    private readonly defaultModel: string;
    private readonly baseUrl: string;

    constructor(options: ClaudeDriverOptions) {
        this.apiKey = options.apiKey;
        this.defaultModel = options.defaultModel ?? "claude-sonnet-4-6";
        this.baseUrl =
            options.baseUrl ?? "https://api.anthropic.com";
    }

    async complete(
        prompt: string,
        options?: ModelOptions,
    ): Promise<ModelResponse> {
        const body: Record<string, unknown> = {
            model: this.defaultModel,
            max_tokens: options?.maxTokens ?? 4096,
            messages: [{ role: "user", content: prompt }],
        };

        if (options?.systemPrompt) {
            body.system = options.systemPrompt;
        }

        if (options?.temperature !== undefined) {
            body.temperature = options.temperature;
        }

        const response = await fetch(`${this.baseUrl}/v1/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Claude API error (${response.status}): ${errorText}`,
            );
        }

        const data = (await response.json()) as ClaudeApiResponse;

        const content = data.content
            .filter((block) => block.type === "text")
            .map((block) => block.text ?? "")
            .join("\n");

        return {
            content,
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
            model: data.model,
        };
    }

    getDriverName(): string {
        return "claude";
    }
}