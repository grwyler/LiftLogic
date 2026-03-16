import { OrchestrationPersistence } from "../../domain/orchestration/persistence";
import { getMongoOrchestrationPersistence } from "./mongoStore";
import { getOrchestrationStoreBackend, validateOrchestrationRuntimeConfig } from "./config";
import { getPostgresOrchestrationPersistence } from "./postgresStore";

export const getConfiguredOrchestrationBackend = getOrchestrationStoreBackend;

let backendLogged = false;

export const getOrchestrationPersistence =
  async (): Promise<OrchestrationPersistence> => {
    const config = validateOrchestrationRuntimeConfig();
    if (!backendLogged) {
      console.info(
        `[orchestration] Using ${config.backend} persistence backend (seed data ${config.seedEnabled ? "enabled" : "disabled"}).`
      );
      backendLogged = true;
    }

    return getConfiguredOrchestrationBackend() === "postgres"
      ? getPostgresOrchestrationPersistence()
      : getMongoOrchestrationPersistence();
  };
