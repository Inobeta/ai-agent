import knexFactory from "knex";
import {
    AiAgent,
    type AiModelDriver,
    type ModelOptions,
    type ModelResponse,
} from "../src";

interface TaskPriorityInput {
    project: string;
    tasks: string[];
}

interface TaskSuggestion {
    title: string;
    priority: "high" | "medium" | "low";
}

class ExampleDriver implements AiModelDriver {
    async complete(_prompt: string, _options?: ModelOptions): Promise<ModelResponse> {
        const content = JSON.stringify([
            {
                data: { title: "Fix payment webhook retries", priority: "high" },
                confidence: 0.93,
                reason: "Revenue-impacting failure path",
            },
            {
                data: { title: "Polish dashboard empty state", priority: "low" },
                confidence: 0.62,
                reason: "UX improvement, not blocking",
            },
        ]);

        return {
            content,
            inputTokens: 120,
            outputTokens: 65,
            model: "example-static-v1",
        };
    }

    getDriverName(): string {
        return "example";
    }
}

class TaskPriorityAgent extends AiAgent<TaskPriorityInput, TaskSuggestion> {
    protected async gatherContext(input: TaskPriorityInput): Promise<TaskPriorityInput> {
        return input;
    }

    protected buildPrompt(context: unknown): string {
        const input = context as TaskPriorityInput;
        return `Project: ${input.project}\nTasks:\n- ${input.tasks.join("\n- ")}`;
    }

    protected parseSuggestions(rawContent: string): Array<{
        data: TaskSuggestion;
        confidence: number;
        reason: string;
    }> {
        const parsed = JSON.parse(rawContent) as Array<{
            data: TaskSuggestion;
            confidence: number;
            reason: string;
        }>;

        if (!Array.isArray(parsed)) {
            throw new Error("Model output must be an array");
        }

        return parsed;
    }

    protected async validateSuggestions(
        suggestions: Array<{ data: TaskSuggestion; confidence: number; reason: string }>,
        _context: unknown,
    ): Promise<Array<{ data: TaskSuggestion; confidence: number; reason: string }>> {
        return suggestions.filter((item) => {
            return (
                typeof item.data?.title === "string" &&
                ["high", "medium", "low"].includes(item.data?.priority) &&
                item.confidence >= 0 &&
                item.confidence <= 1
            );
        });
    }

    protected buildInputSummary(input: TaskPriorityInput): Record<string, unknown> {
        return {
            project: input.project,
            taskCount: input.tasks.length,
        };
    }

    protected buildOutputSummary(
        suggestions: Array<{ suggestionId: number; data: TaskSuggestion; confidence: number; reason: string }>,
    ): Record<string, unknown> {
        return {
            suggestionCount: suggestions.length,
            topPriority: suggestions[0]?.data.priority ?? null,
        };
    }
}

async function main(): Promise<void> {
    const knex = knexFactory({
        client: "pg",
        connection: process.env.DATABASE_URL,
    });

    try {
        // The code must exist in ai_agents and be active.
        await knex("ai_agents")
            .insert({ code: "task-priority", description: "Demo task prioritization agent" })
            .onConflict("code")
            .ignore();

        const agent = new TaskPriorityAgent(knex, "task-priority");
        const result = await agent.run(
            {
                project: "Billing",
                tasks: [
                    "Fix payment webhook retries",
                    "Polish dashboard empty state",
                    "Improve failed invoice email copy",
                ],
            },
            "00000000-0000-0000-0000-000000000001",
            new ExampleDriver(),
        );

        console.log(JSON.stringify(result, null, 2));
    } finally {
        await knex.destroy();
    }
}

void main();
