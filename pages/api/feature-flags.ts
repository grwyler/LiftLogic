import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "./auth/[...nextauth]";
import { connectToDatabase } from "../../utils/mongodb";
import { getSessionUserId, isBugWorkflowAdminSession } from "../../utils/adminAuthorization";
import {
  BillingPlan,
  FeatureFlagDoc,
  FeatureFlagExposureDoc,
  FeatureFlagKey,
  FeatureFlagVariant,
  UserDoc,
} from "../../utils/types";
import { mergeFeatureFlagConfigs, resolveFeatureFlags } from "../../utils/featureFlags";

const FEATURE_FLAG_KEYS: FeatureFlagKey[] = [
  "onboarding_guided_starter",
  "pricing_premium_proof_experiment",
  "workout_focus_mode",
];

const FEATURE_FLAG_VARIANTS: FeatureFlagVariant[] = ["control", "variant_a", "variant_b"];

const isValidFeatureFlagKey = (value: unknown): value is FeatureFlagKey =>
  FEATURE_FLAG_KEYS.includes(value as FeatureFlagKey);

const isValidVariant = (value: unknown): value is FeatureFlagVariant =>
  FEATURE_FLAG_VARIANTS.includes(value as FeatureFlagVariant);

const normalizePercent = (value: unknown) =>
  Math.min(100, Math.max(0, Math.round(Number(value) || 0)));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const db = await connectToDatabase();
  const featureFlags = db.collection<FeatureFlagDoc>("featureFlags");
  const featureFlagExposures = db.collection<FeatureFlagExposureDoc>("featureFlagExposures");

  if (req.method === "GET") {
    if (String(req.query.admin || "") === "1") {
      if (!session || !isBugWorkflowAdminSession(session)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const flags = mergeFeatureFlagConfigs(await featureFlags.find({}).toArray());
      return res.status(200).json({ flags });
    }

    const userId = getSessionUserId(session);
    const route = String(req.query.route || "");
    const user =
      userId && ObjectId.isValid(userId)
        ? await db
            .collection<UserDoc>("users")
            .findOne({ _id: new ObjectId(userId) }, { projection: { billingPlan: 1 } })
        : null;
    const flags = resolveFeatureFlags({
      configs: await featureFlags.find({}).toArray(),
      route,
      identity: userId || String(req.query.anonymousId || req.cookies?.liftlogic_funnel_id || "anonymous"),
      isAuthenticated: Boolean(userId),
      billingPlan: (user?.billingPlan || "free") as BillingPlan,
    });

    return res.status(200).json({ flags });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const action = String(req.body?.action || "");

  if (action === "upsertConfig") {
    if (!session || !isBugWorkflowAdminSession(session)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const incoming = req.body?.flag || {};
    if (!isValidFeatureFlagKey(incoming.key)) {
      return res.status(400).json({ message: "Invalid feature flag key" });
    }

    const nextFlag: FeatureFlagDoc = {
      key: incoming.key,
      enabled: Boolean(incoming.enabled),
      surface: incoming.surface,
      description: String(incoming.description || "").trim(),
      rolloutPercent: normalizePercent(incoming.rolloutPercent),
      variantWeights: incoming.variantWeights || undefined,
      targeting: incoming.targeting || undefined,
      updatedAt: new Date(),
      updatedByEmail: session.user?.email || undefined,
    };

    await featureFlags.updateOne(
      { key: nextFlag.key },
      { $set: nextFlag },
      { upsert: true }
    );

    return res.status(200).json({ flag: nextFlag });
  }

  if (action === "logExposure") {
    const key = req.body?.key;
    const variant = req.body?.variant;
    if (!isValidFeatureFlagKey(key) || !isValidVariant(variant)) {
      return res.status(400).json({ message: "Invalid exposure payload" });
    }

    const configs = mergeFeatureFlagConfigs(await featureFlags.find({ key }).toArray());
    const config = configs.find((flag) => flag.key === key);
    if (!config) {
      return res.status(404).json({ message: "Unknown feature flag" });
    }

    const userId = getSessionUserId(session);
    const anonymousId = String(req.body?.anonymousId || req.cookies?.liftlogic_funnel_id || "").trim();

    await featureFlagExposures.insertOne({
      key,
      surface: config.surface,
      variant,
      route: String(req.body?.route || "").trim() || undefined,
      source: String(req.body?.source || "").trim() || undefined,
      userId: userId || undefined,
      anonymousId: anonymousId || undefined,
      createdAt: new Date(),
    });

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ message: "Unsupported action" });
}
