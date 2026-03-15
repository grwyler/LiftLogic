import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "./auth/[...nextauth]";
import { connectToDatabase } from "../../utils/mongodb";
import { markBetaFunnelMilestone } from "../../utils/betaFunnel";

const parseSessionUserId = (session: any) =>
  String(session?.user?._id || session?.token?.user?._id || "").trim();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = parseSessionUserId(session);

  if (!session || !userId || !ObjectId.isValid(userId)) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const milestone = String(req.body?.milestone ?? "").trim();
  const occurredAt = req.body?.occurredAt;

  if (milestone !== "landing_cta") {
    return res.status(400).json({ message: "Unsupported milestone" });
  }

  const db = await connectToDatabase();
  const users = db.collection("users");
  const existingUser = await users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { betaFunnel: 1 } }
  );

  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const betaFunnel = markBetaFunnelMilestone({
    funnel: existingUser.betaFunnel,
    key: "landingCtaAt",
    occurredAt,
  });

  await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        betaFunnel,
        updatedAt: new Date(),
      },
    }
  );

  return res.status(200).json({ success: true });
}
