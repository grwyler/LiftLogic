import { GetServerSideProps } from "next";
import { serializeDetail } from "../../server/orchestration/serialization";
import { ensureSeededOrchestrationData } from "../../server/orchestration/seed";
import { getWorkItemDetailFromStore } from "../../server/orchestration/service";
import { getOrchestrationPersistence } from "../../server/orchestration/store";
import { Props } from "./workItemDetailPage";

export const getWorkItemDetailServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  await ensureSeededOrchestrationData();
  const id = Array.isArray(context.params?.id)
    ? context.params?.id[0]
    : context.params?.id;
  const store = await getOrchestrationPersistence();
  const detail = await getWorkItemDetailFromStore({
    store,
    id: String(id || ""),
  });

  if (!detail) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      detail: serializeDetail(detail),
    },
  };
};
