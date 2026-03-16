const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

export const orchestrationAppConfig = {
  platformName:
    readEnv(
      "NEXT_PUBLIC_ORCHESTRATION_PLATFORM_NAME",
      "ORCHESTRATION_PLATFORM_NAME"
    ) || "Signal Orchestrator",
  queueLabel:
    readEnv(
      "NEXT_PUBLIC_ORCHESTRATION_QUEUE_LABEL",
      "ORCHESTRATION_QUEUE_LABEL"
    ) || "Work Queue",
};
