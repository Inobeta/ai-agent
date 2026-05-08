export interface DriverModelInfo {
    driverName: string;
    driverLabel: string;
    models: ModelInfo[];
}

export interface ModelInfo {
    id: string;
    label: string;
    isDefault: boolean;
}

const DRIVER_REGISTRY: DriverModelInfo[] = [
    {
        driverName: "claude",
        driverLabel: "Anthropic Claude",
        models: [
            {
                id: "claude-sonnet-4-6",
                label: "Claude Sonnet 4.6",
                isDefault: true,
            },
        ],
    },
];

export function getAvailableDrivers(): DriverModelInfo[] {
    return DRIVER_REGISTRY;
}

export function getAvailableModels(driverName: string): ModelInfo[] {
    const driver = DRIVER_REGISTRY.find(
        (d) => d.driverName === driverName,
    );
    return driver?.models ?? [];
}

export function getDefaultModel(driverName: string): string | null {
    const models = getAvailableModels(driverName);
    const defaultModel = models.find((m) => m.isDefault);
    return defaultModel?.id ?? models[0]?.id ?? null;
}

export function isValidDriver(driverName: string): boolean {
    return DRIVER_REGISTRY.some((d) => d.driverName === driverName);
}

export function isValidModel(
    driverName: string,
    modelId: string,
): boolean {
    return getAvailableModels(driverName).some((m) => m.id === modelId);
}