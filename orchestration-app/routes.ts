import { orchestrationAppConfig } from "../utils/orchestrationAppConfig";

export const orchestrationRoutes = {
  queue: "/work-items",
  workItem: (id: string) => `/work-items/${id}`,
  api: {
    signals: "/api/signals",
    workItems: "/api/work-items",
    workItem: (id: string) => `/api/work-items/${id}`,
    duplicate: (id: string) => `/api/work-items/${id}/duplicate`,
  },
};

export const orchestrationNavigation = {
  primary: {
    href: orchestrationRoutes.queue,
    label: orchestrationAppConfig.queueLabel,
    description: "Open the orchestration work queue.",
  },
};
