import WorkItemDetailPage, {
  Props,
} from "../../orchestration-app/pages/workItemDetailPage";
import { getWorkItemDetailServerSideProps } from "../../orchestration-app/pages/workItemDetailServer";

export const getServerSideProps = getWorkItemDetailServerSideProps;

export default function WorkItemDetailHostPage(props: Props) {
  return <WorkItemDetailPage {...props} />;
}
