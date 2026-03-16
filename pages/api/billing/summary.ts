import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../utils/mongodb";
import {
  buildBillingSummary,
  ensureBillingUserIndexes,
} from "../../../server/billing/service";
import { getStripeBillingConfig } from "../../../server/billing/config";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = sanitizeText((session?.user as any)?._id || (session as any)?.token?.user?._id);

  if (!session || !ObjectId.isValid(userId)) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const db = await connectToDatabase();
    await ensureBillingUserIndexes(db);
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    }) as any;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(
      buildBillingSummary({
        user,
        config: getStripeBillingConfig(),
      })
    );
  } catch (error) {
    console.error("Billing summary error:", error);
    return res.status(500).json({ message: "Unable to load billing summary." });
  }
}
