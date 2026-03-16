import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { ObjectId } from "mongodb";
import { RecurringRuleDoc } from "@/utils/types";
import { getEntitlementMessage, hasEntitlement } from "@/utils/entitlements";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = await connectToDatabase();
  const col = db.collection<RecurringRuleDoc>("recurringRules");
  const users = db.collection("users");

  try {
    switch (req.method) {
      case "POST": {
        const { rule } = req.body as { rule?: RecurringRuleDoc };
        console.debug("[POST] Payload:", rule);

        if (!rule?.routineName) {
          console.warn("[POST] routineName missing");
          return res.status(400).json({ message: "routineName required" });
        }

        if (!rule?.userId) {
          console.warn("[POST] userId missing");
          return res.status(400).json({ message: "userId required" });
        }

        const user =
          ObjectId.isValid(String(rule.userId))
            ? await users.findOne({ _id: new ObjectId(String(rule.userId)) })
            : null;

        if (!hasEntitlement(user as any, "recurringWorkoutScheduling")) {
          return res.status(403).json({
            message: getEntitlementMessage("recurringWorkoutScheduling"),
          });
        }

        const exerciseId = String(rule.exerciseId ?? "").trim();
        if (!exerciseId) {
          console.warn("[POST] exerciseId missing");
          return res.status(400).json({ message: "exerciseId required" });
        }

        const {
          _id: _discardId,
          createdAt: _discardCreatedAt,
          updatedAt: _discardUpdatedAt,
          exerciseId: _discardExerciseId,
          ...cleanRule
        } = rule;

        const filter =
          rule._id && ObjectId.isValid(String(rule._id))
            ? { _id: new ObjectId(String(rule._id)) }
            : {
                userId: rule.userId,
                exerciseId,
                routineName: rule.routineName,
                active: true,
              };

        const doc: RecurringRuleDoc = {
          ...cleanRule,
          exerciseId,
          updatedAt: new Date(),
          active: rule.active ?? true,
          recurrenceType: rule.recurrenceType ?? "weekly",
          interval: rule.interval ?? rule.intervalWeeks ?? 1,
          intervalWeeks: rule.intervalWeeks ?? 1,
          daysOfWeek:
            rule.daysOfWeek && rule.daysOfWeek.length > 0
              ? rule.daysOfWeek
              : [rule.dayOfWeek],
          dayOfMonth: rule.dayOfMonth,
          templateSets: rule.templateSets ?? [],
        };

        const result = await col.updateOne(
          filter,
          { $set: doc, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );

        const mode = result.upsertedCount ? "Inserted" : "Updated";
        const savedRule = result.upsertedCount
          ? { _id: result.upsertedId ?? undefined, ...doc }
          : await col.findOne(filter);
        const docId = savedRule?._id ?? "(existing)";
        console.info(`[POST] ${mode} - id: ${docId}`);

        return res
          .status(result.upsertedCount ? 201 : 200)
          .json({ rule: savedRule ?? { _id: docId, ...doc } });
      }

      case "GET": {
        const { userId, routineName } = req.query;
        if (!userId) {
          return res.status(400).json({ message: "userId required" });
        }

        const query: Record<string, unknown> = {
          userId,
          active: true,
        };

        if (routineName) {
          query.routineName = routineName;
        }

        const rules = await col.find(query).toArray();
        rules.sort(
          (a, b) =>
            Number(a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            Number(b.sortOrder ?? Number.MAX_SAFE_INTEGER)
        );
        return res.status(200).json({ rules });
      }

      case "DELETE": {
        const { ruleId } = req.body as { ruleId?: string };
        console.debug("[DELETE] ruleId:", ruleId);

        if (!ruleId || !ObjectId.isValid(ruleId)) {
          console.warn("[DELETE] Bad or missing ruleId");
          return res
            .status(400)
            .json({ message: "ruleId required & must be valid" });
        }

        const objId = new ObjectId(ruleId);
        const existingRule = await col.findOne({ _id: objId });
        const user =
          existingRule?.userId && ObjectId.isValid(String(existingRule.userId))
            ? await users.findOne({
                _id: new ObjectId(String(existingRule.userId)),
              })
            : null;

        if (existingRule && !hasEntitlement(user as any, "recurringWorkoutScheduling")) {
          return res.status(403).json({
            message: getEntitlementMessage("recurringWorkoutScheduling"),
          });
        }

        const { modifiedCount } = await col.updateOne(
          { _id: objId, active: true },
          { $set: { active: false, updatedAt: new Date() } }
        );

        console.info(
          `[DELETE] ${modifiedCount ? "Deactivated" : "Not found"} - id: ${ruleId}`
        );
        return res.status(modifiedCount ? 200 : 404).json({
          message: modifiedCount ? "Rule deactivated" : "Rule not found",
        });
      }

      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        return res.status(405).end();
    }
  } catch (e) {
    console.error("recurringRule error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
