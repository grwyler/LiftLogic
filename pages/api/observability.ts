import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { connectToDatabase } from "../../utils/mongodb";
import {
  ALERT_LOOKBACK_WINDOW_MS,
  buildObservabilityFingerprint,
  sanitizeObservabilityEvent,
  shouldCreateObservabilityAlert,
  summarizeObservabilityAlerts,
} from "../../utils/observability";
import {
  getSessionUserId,
  isBugWorkflowAdminSession,
} from "../../utils/adminAuthorization";
import { ObservabilityAlertDoc, ObservabilityEventDoc } from "../../utils/types";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  const db = await connectToDatabase();
  const eventsCollection = db.collection<ObservabilityEventDoc>("observabilityEvents");
  const alertsCollection = db.collection<ObservabilityAlertDoc>("observabilityAlerts");

  if (req.method === "GET") {
    if (!session || !isBugWorkflowAdminSession(session)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const summaryKind = sanitizeText(req.query.summary);
    if (summaryKind !== "core") {
      return res.status(400).json({ message: "Unsupported summary" });
    }

    const lookbackHours = Math.max(1, Number(req.query.lastHours || 72));
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const [events, alerts] = await Promise.all([
      eventsCollection.find({ createdAt: { $gte: since } }).toArray(),
      alertsCollection.find({ lastTriggeredAt: { $gte: since } }).toArray(),
    ]);

    return res.status(200).json({
      ...summarizeObservabilityAlerts(events, alerts),
      recentAlerts: alerts
        .sort(
          (left, right) =>
            new Date(right.lastTriggeredAt).getTime() -
            new Date(left.lastTriggeredAt).getTime()
        )
        .slice(0, 10),
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const incomingEvents = Array.isArray(req.body?.events)
    ? req.body.events
    : req.body?.event
    ? [req.body.event]
    : [];

  if (incomingEvents.length === 0) {
    return res.status(400).json({ message: "At least one event is required" });
  }

  const sessionUserId = getSessionUserId(session);
  const normalizedEvents = incomingEvents.map((event) =>
    sanitizeObservabilityEvent({
      ...event,
      userId: sanitizeText(event?.userId) || sessionUserId || undefined,
      environment:
        sanitizeText(event?.environment) ||
        sanitizeText(process.env.NEXT_PUBLIC_ENV) ||
        process.env.NODE_ENV ||
        "development",
      releaseVersion:
        sanitizeText(event?.releaseVersion) ||
        sanitizeText(process.env.NEXT_PUBLIC_APP_VERSION),
      commitSha:
        sanitizeText(event?.commitSha) ||
        sanitizeText(process.env.NEXT_PUBLIC_COMMIT_SHA),
    })
  );

  if (normalizedEvents.length === 1) {
    const fingerprint =
      normalizedEvents[0].fingerprint ||
      buildObservabilityFingerprint(normalizedEvents[0]);
    normalizedEvents[0].fingerprint = fingerprint;
  }

  await eventsCollection.insertMany(
    normalizedEvents.map((event) => ({
      ...event,
      fingerprint: event.fingerprint || buildObservabilityFingerprint(event),
      createdAt: event.createdAt || new Date(),
    }))
  );

  const createdAlerts: ObservabilityAlertDoc[] = [];

  for (const event of normalizedEvents) {
    if (event.status !== "failure" && event.kind !== "route_performance") {
      continue;
    }

    const fingerprint = event.fingerprint || buildObservabilityFingerprint(event);
    const since = new Date(Date.now() - ALERT_LOOKBACK_WINDOW_MS);
    const count = await eventsCollection.countDocuments({
      fingerprint,
      createdAt: { $gte: since },
    });

    if (!shouldCreateObservabilityAlert(event.kind, count)) {
      continue;
    }

    const now = new Date();
    const existingAlert = await alertsCollection.findOne({ fingerprint });

    const nextAlert: ObservabilityAlertDoc = {
      kind: event.kind,
      fingerprint,
      route: event.route,
      message: event.message,
      count,
      status: "open",
      firstTriggeredAt: existingAlert?.firstTriggeredAt || now,
      lastTriggeredAt: now,
      latestEventAt: now,
    };

    await alertsCollection.updateOne(
      { fingerprint },
      {
        $set: nextAlert,
        $setOnInsert: {
          firstTriggeredAt: nextAlert.firstTriggeredAt,
        },
      },
      { upsert: true }
    );

    createdAlerts.push(nextAlert);
  }

  return res.status(200).json({
    success: true,
    alertsCreated: createdAlerts.length,
  });
}
