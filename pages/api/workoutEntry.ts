import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { ObjectId } from "mongodb";
import { WorkoutEntryDoc } from "@/utils/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.info(`[workoutEntry] ${req.method} ${req.url}`);

  const db = await connectToDatabase();
  const col = db.collection<WorkoutEntryDoc>("workoutEntries");

  try {
    /* ================================================================== */
    /* POST  – UPSERT                                                     */
    /* ================================================================== */
    if (req.method === "POST") {
      const { entry } = req.body as { entry?: WorkoutEntryDoc };
      console.debug("[POST] Payload:", entry);

      /* ---------- basic validation ---------- */
      if (!entry?.routineName) {
        console.warn("[POST] routineName missing");
        return res.status(400).json({ message: "routineName required" });
      }

      const exerciseId = String(entry.exerciseId ?? "").trim();
      if (!exerciseId) {
        console.warn("[POST] Missing exerciseId");
        return res.status(400).json({ message: "exerciseId required" });
      }

      /* ---------- coerce the incoming date ---------- */
      const rawDate = entry.date as unknown as string;
      let isoDate: Date;

      if (rawDate instanceof Date) {
        isoDate = rawDate;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        isoDate = new Date(rawDate); // "2025-07-15"
      } else {
        const thisYear = new Date().getFullYear();
        const candidate = `${rawDate.trim()} ${thisYear}`;
        isoDate = new Date(candidate);
        if (isNaN(+isoDate)) {
          console.warn("[POST] Unparseable date", rawDate);
          return res.status(400).json({ message: "Bad date format" });
        }
      }

      console.debug("[POST] Parsed date →", isoDate.toISOString());

      /* ---------- sanitize entry (strip readonly fields) ---------- */
      const {
        _id: _discard0, // ← remove _id
        createdAt: _discard1,
        updatedAt: _discard2,
        date: _discard3,
        exerciseId: _discard4,
        ...cleanEntry
      } = entry;

      /* ---------- build filter ---------- */
      const filter = {
        userId: entry.userId,
        exerciseId,
        date: isoDate,
        routineName: entry.routineName,
      };
      console.debug("[POST] Upsert filter:", filter);

      /* ---------- DB call ---------- */
      const result = await col.updateOne(
        filter,
        {
          $set: {
            ...cleanEntry, // no client _id or timestamps
            exerciseId,
            date: isoDate,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      const mode = result.upsertedCount ? "Inserted" : "Updated";
      const docId = result.upsertedId?._id ?? "(existing)";
      console.info(`[POST] ${mode} – id: ${docId}`);

      return res
        .status(result.upsertedCount ? 201 : 200)
        .json({ message: "Workout entry saved", entryId: docId });
    }

    /* ================================================================== */
    /* GET  – daily entries                                               */
    /* ================================================================== */
    /* ---------- GET daily entries ---------- */
    if (req.method === "GET") {
      const { userId, date, routineName } = req.query;
      console.debug("[GET] Query params:", req.query);

      if (!userId || !date) {
        console.warn("[GET] Missing userId or date");
        return res.status(400).json({ message: "userId & date required" });
      }

      /* -------- unified date parser -------- */
      const raw = date as string;
      const thisYear = new Date().getFullYear();

      //  A) "2025-07-15"  -> keep as‑is
      //  B) "Tuesday, July 15" or "July 15" -> append the current year
      const safe = /^\d{4}-\d{2}-\d{2}/.test(raw)
        ? raw
        : `${raw.trim()} ${thisYear}`;

      const day = new Date(safe);
      if (isNaN(+day)) {
        console.warn("[GET] Bad date format:", raw);
        return res.status(400).json({ message: "Bad date format" });
      }

      const start = new Date(day.setHours(0, 0, 0, 0));
      const end = new Date(day.setHours(23, 59, 59, 999));

      const query: any = { userId, date: { $gte: start, $lte: end } };
      if (routineName) query.routineName = routineName;

      console.debug("[GET] Mongo query:", query);

      const entries = await col.find(query).toArray();
      console.info(`[GET] Returned ${entries.length} entries`);
      return res.status(200).json({ entries });
    }

    /* ================================================================== */
    /* DELETE  – remove one entry                                         */
    /* ================================================================== */
    if (req.method === "DELETE") {
      const { entryId } = req.body as { entryId?: string };
      console.debug("[DELETE] entryId:", entryId);

      if (!entryId) {
        console.warn("[DELETE] entryId missing");
        return res.status(400).json({ message: "`entryId` required" });
      }

      let objId: ObjectId;
      try {
        objId = new ObjectId(entryId);
      } catch {
        console.warn("[DELETE] Bad entryId");
        return res.status(400).json({ message: "Bad entryId" });
      }

      const { deletedCount } = await col.deleteOne({ _id: objId });
      console.info(
        `[DELETE] ${deletedCount ? "Deleted" : "Not found"} – id: ${entryId}`
      );
      return res
        .status(deletedCount ? 200 : 404)
        .json({ message: deletedCount ? "Deleted" : "Not found" });
    }

    /* ================================================================== */
    /* Method not allowed                                                 */
    /* ================================================================== */
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    console.warn("[405] Method Not Allowed");
    return res.status(405).end();
  } catch (e) {
    console.error("[500] workoutEntry error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
