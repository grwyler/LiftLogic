import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { connectToDatabase } from "../../utils/mongodb";
import {
  buildReminderLocalDateKey,
  normalizeReminderPreferences,
  shouldDeliverComebackNudge,
  shouldDeliverScheduledWorkoutReminder,
} from "../../utils/reminders";
import {
  getSessionUserId,
  isBugWorkflowAdminSession,
} from "../../utils/adminAuthorization";
import { ReminderDeliveryDoc, UserDoc, WorkoutEntryDoc } from "../../utils/types";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const buildReminderMessage = ({
  username,
  kind,
}: {
  username?: string;
  kind: ReminderDeliveryDoc["kind"];
}) => {
  if (kind === "comeback_nudge") {
    return {
      title: "Comeback nudge",
      message: `Welcome back${username ? `, ${username}` : ""}. A short session today is enough to restart the habit.`,
    };
  }

  return {
    title: "Scheduled workout reminder",
    message: `Your planned workout window is open${username ? `, ${username}` : ""}. Start with the first set and keep it simple.`,
  };
};

const dispatchDueReminders = async (db: Awaited<ReturnType<typeof connectToDatabase>>) => {
  const users = await db
    .collection<UserDoc>("users")
    .find(
      { "reminderPreferences.enabled": true },
      {
        projection: {
          username: 1,
          reminderPreferences: 1,
        },
      }
    )
    .toArray();
  const deliveries = db.collection<ReminderDeliveryDoc>("reminderDeliveries");
  const workoutEntries = db.collection<WorkoutEntryDoc>("workoutEntries");
  const now = new Date();
  let createdCount = 0;

  for (const user of users) {
    const userId = String(user._id || "").trim();
    if (!userId) {
      continue;
    }

    const preferences = normalizeReminderPreferences(
      user.reminderPreferences,
      "UTC"
    );
    const recentEntries = await workoutEntries
      .find(
        {
          userId,
          date: {
            $gte: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
          },
        },
        {
          projection: {
            complete: 1,
            skipped: 1,
            date: 1,
          },
        }
      )
      .toArray();

    const dueKinds: ReminderDeliveryDoc["kind"][] = [];
    if (
      shouldDeliverScheduledWorkoutReminder({
        preferences,
        entries: recentEntries,
        now,
      })
    ) {
      dueKinds.push("scheduled_workout");
    }

    if (
      shouldDeliverComebackNudge({
        preferences,
        entries: recentEntries,
        now,
      })
    ) {
      dueKinds.push("comeback_nudge");
    }

    for (const kind of dueKinds) {
      const localDateKey = buildReminderLocalDateKey(
        now,
        preferences.timezone || "UTC"
      );
      const reminderKey = `${kind}:${localDateKey}`;
      const existing = await deliveries.findOne({ userId, reminderKey });
      if (existing) {
        continue;
      }

      const content = buildReminderMessage({
        username: user.username,
        kind,
      });

      await deliveries.insertOne({
        userId,
        kind,
        reminderKey,
        title: content.title,
        message: content.message,
        route: "/routines",
        deliveryChannel: "in_app",
        scheduledForLocal:
          preferences.scheduledWorkoutReminderTime || undefined,
        timezone: preferences.timezone,
        deliveredAt: now,
        metadata: {
          timezone: preferences.timezone,
        },
      });

      createdCount += 1;
    }
  }

  return { createdCount };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  const userId = getSessionUserId(session);
  const db = await connectToDatabase();
  const deliveries = db.collection<ReminderDeliveryDoc>("reminderDeliveries");

  if (req.method === "GET") {
    if (sanitizeText(req.query.summary) === "retention") {
      if (!session || !isBugWorkflowAdminSession(session)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const reminderDocs = await deliveries.find({}).toArray();
      return res.status(200).json({
        delivered: reminderDocs.length,
        opened: reminderDocs.filter((doc) => doc.openedAt).length,
        read: reminderDocs.filter((doc) => doc.readAt).length,
        postReminderWorkoutStarts: reminderDocs.filter(
          (doc) => doc.postReminderWorkoutStartedAt
        ).length,
      });
    }

    if (!session || !userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const unreadOnly = sanitizeText(req.query.unreadOnly) !== "false";
    const results = await deliveries
      .find(
        {
          userId,
          ...(unreadOnly ? { readAt: { $exists: false } } : {}),
        },
        {
          projection: {
            title: 1,
            message: 1,
            kind: 1,
            route: 1,
            deliveredAt: 1,
          },
        }
      )
      .toArray();

    return res.status(200).json({ reminders: results });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const action = sanitizeText(req.body?.action);

  if (action === "dispatchDue") {
    if (!session || !isBugWorkflowAdminSession(session)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await dispatchDueReminders(db);
    return res.status(200).json({
      success: true,
      ...result,
    });
  }

  if (!session || !userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const reminderId = sanitizeText(req.body?.reminderId);
  if (!reminderId) {
    return res.status(400).json({ message: "Reminder id is required" });
  }

  if (action === "acknowledge") {
    await deliveries.updateOne(
      { _id: new (await import("mongodb")).ObjectId(reminderId), userId },
      {
        $set: {
          openedAt: new Date(),
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ message: "Unsupported action" });
}
