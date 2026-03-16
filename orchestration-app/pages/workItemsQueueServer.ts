import { GetServerSideProps } from "next";
import { WorkItemQuery } from "../../domain/orchestration/types";
import { serializeQueueResult } from "../../server/orchestration/serialization";
import { ensureSeededOrchestrationData } from "../../server/orchestration/seed";
import { listWorkItemsFromStore } from "../../server/orchestration/service";
import { getOrchestrationPersistence } from "../../server/orchestration/store";
import { Props } from "./workItemsQueuePage";

const readString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value || "";

export const getWorkItemsQueueServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  await ensureSeededOrchestrationData();
  const query: WorkItemQuery = {
    project: readString(context.query.project) || undefined,
    type: readString(context.query.type) || undefined,
    severity: (readString(context.query.severity) || undefined) as WorkItemQuery["severity"],
    triageStatus: (readString(context.query.triageStatus) ||
      undefined) as WorkItemQuery["triageStatus"],
    search: readString(context.query.search) || undefined,
    includeDuplicates: readString(context.query.includeDuplicates) === "true",
    sortBy: (readString(context.query.sortBy) || undefined) as WorkItemQuery["sortBy"],
    sortDirection: (readString(context.query.sortDirection) ||
      undefined) as WorkItemQuery["sortDirection"],
  };
  const store = await getOrchestrationPersistence();
  const result = await listWorkItemsFromStore({ store, query });

  return {
    props: {
      ...serializeQueueResult(result),
      initialQuery: {
        project: query.project || "",
        type: query.type || "",
        severity: query.severity || "",
        triageStatus: query.triageStatus || "",
        search: query.search || "",
        includeDuplicates: Boolean(query.includeDuplicates),
        sortBy: query.sortBy || "updatedAt",
        sortDirection: query.sortDirection || "desc",
      },
    },
  };
};
