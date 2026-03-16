import { Db, ObjectId } from "mongodb";
import { OrchestrationPersistence } from "../../domain/orchestration/persistence";
import {
  ProjectDoc,
  ReviewActionDoc,
  SignalDoc,
  WorkItemDoc,
} from "../../domain/orchestration/types";
import { connectToOrchestrationMongo } from "./mongoClient";

let indexesReady = false;

const projectsCollectionName = "projects";
const signalsCollectionName = "signals";
const workItemsCollectionName = "workItems";
const reviewActionsCollectionName = "reviewActions";

const toIdString = (value: ObjectId | string | undefined) => String(value || "");

const normalizeWorkItemUpdate = (update: Partial<WorkItemDoc>) => {
  const setFields: Record<string, unknown> = {};
  const unsetFields: Record<string, "" | 1> = {};

  Object.entries(update).forEach(([key, value]) => {
    if (typeof value === "undefined") {
      unsetFields[key] = "";
      return;
    }

    if (key === "projectId" || key === "latestSignalId" || key === "duplicateOfWorkItemId") {
      setFields[key] = toIdString(value as ObjectId | string | undefined);
      return;
    }

    setFields[key] = value;
  });

  return { setFields, unsetFields };
};

export const ensureMongoOrchestrationIndexes = async (db: Db) => {
  if (indexesReady) {
    return;
  }

  await Promise.all([
    db.collection<ProjectDoc>(projectsCollectionName).createIndex({ slug: 1 }, { unique: true }),
    db.collection<SignalDoc>(signalsCollectionName).createIndex({ projectId: 1, createdAt: -1 }),
    db.collection<SignalDoc>(signalsCollectionName).createIndex({ fingerprint: 1, createdAt: -1 }),
    db
      .collection<WorkItemDoc>(workItemsCollectionName)
      .createIndex({ projectId: 1, fingerprint: 1 }, { unique: true }),
    db
      .collection<WorkItemDoc>(workItemsCollectionName)
      .createIndex({ updatedAt: -1, occurrenceCount: -1 }),
    db
      .collection<WorkItemDoc>(workItemsCollectionName)
      .createIndex({ duplicateOfWorkItemId: 1, updatedAt: -1 }),
    db
      .collection<ReviewActionDoc>(reviewActionsCollectionName)
      .createIndex({ workItemId: 1, createdAt: -1 }),
  ]);

  indexesReady = true;
};

export const createMongoOrchestrationPersistence = (
  db: Db
): OrchestrationPersistence => {
  const projects = db.collection<ProjectDoc>(projectsCollectionName);
  const signals = db.collection<SignalDoc>(signalsCollectionName);
  const workItems = db.collection<WorkItemDoc>(workItemsCollectionName);
  const reviewActions = db.collection<ReviewActionDoc>(reviewActionsCollectionName);

  return {
    async findProjectBySlug(slug) {
      return projects.findOne({ slug });
    },
    async listProjects() {
      return projects.find({}).toArray();
    },
    async createProject(project) {
      const result = await projects.insertOne(project);
      return {
        ...project,
        _id: result.insertedId,
      };
    },

    async createSignal(signal) {
      const result = await signals.insertOne({
        ...signal,
        projectId: toIdString(signal.projectId),
      });
      return {
        ...signal,
        projectId: toIdString(signal.projectId),
        _id: result.insertedId,
      };
    },
    async updateSignalWorkItemLink(signalId, workItemId) {
      await signals.updateOne(
        { _id: new ObjectId(signalId) },
        {
          $set: {
            workItemId,
          },
        }
      );
    },
    async listSignalsByWorkItemId(workItemId) {
      return signals.find({ workItemId }).sort({ createdAt: -1 }).toArray();
    },
    async countSignals() {
      return signals.countDocuments();
    },

    async findWorkItemById(id) {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      return workItems.findOne({ _id: new ObjectId(id) });
    },
    async findWorkItemByFingerprint({ projectId, fingerprint }) {
      return workItems.findOne({
        projectId,
        fingerprint,
      });
    },
    async listWorkItems() {
      return workItems.find({}).toArray();
    },
    async createWorkItem(workItem) {
      const result = await workItems.insertOne({
        ...workItem,
        projectId: toIdString(workItem.projectId),
        latestSignalId: workItem.latestSignalId
          ? toIdString(workItem.latestSignalId)
          : undefined,
        duplicateOfWorkItemId: workItem.duplicateOfWorkItemId
          ? toIdString(workItem.duplicateOfWorkItemId)
          : undefined,
      });

      return {
        ...workItem,
        projectId: toIdString(workItem.projectId),
        latestSignalId: workItem.latestSignalId
          ? toIdString(workItem.latestSignalId)
          : undefined,
        duplicateOfWorkItemId: workItem.duplicateOfWorkItemId
          ? toIdString(workItem.duplicateOfWorkItemId)
          : undefined,
        _id: result.insertedId,
      };
    },
    async updateWorkItem(id, update) {
      const { setFields, unsetFields } = normalizeWorkItemUpdate(update);
      const updateDoc: {
        $set?: Record<string, unknown>;
        $unset?: Record<string, "" | 1>;
      } = {};

      if (Object.keys(setFields).length > 0) {
        updateDoc.$set = setFields;
      }

      if (Object.keys(unsetFields).length > 0) {
        updateDoc.$unset = unsetFields;
      }

      await workItems.updateOne({ _id: new ObjectId(id) }, updateDoc);
      const updated = await workItems.findOne({ _id: new ObjectId(id) });
      if (!updated) {
        throw new Error("Work item not found after update.");
      }

      return updated;
    },
    async listDuplicateChildren(workItemId) {
      return workItems.find({ duplicateOfWorkItemId: workItemId }).sort({ updatedAt: -1 }).toArray();
    },
    async countWorkItems() {
      return workItems.countDocuments();
    },

    async createReviewActions(actions) {
      if (actions.length === 0) {
        return [];
      }

      const docs = actions.map((action) => ({
        ...action,
        workItemId: toIdString(action.workItemId),
      }));
      const result = await reviewActions.insertMany(docs);
      const insertedIds = Object.values(result.insertedIds || {});

      return docs.map((doc, index) => ({
        ...doc,
        _id: insertedIds[index] as ObjectId | undefined,
      }));
    },
    async listReviewActionsByWorkItemId(workItemId) {
      return reviewActions.find({ workItemId }).sort({ createdAt: -1 }).toArray();
    },
    async countReviewActions() {
      return reviewActions.countDocuments();
    },
  };
};

export const getMongoOrchestrationPersistence = async () => {
  const db = await connectToOrchestrationMongo();
  await ensureMongoOrchestrationIndexes(db);
  return createMongoOrchestrationPersistence(db);
};
