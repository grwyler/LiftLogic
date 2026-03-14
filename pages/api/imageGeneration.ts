import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const prompt = String(req.body?.prompt ?? "").trim();
  if (!prompt) {
    return res.status(400).json({ message: "Prompt is required" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      message: "Image generation is not configured on this environment.",
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: "512x512",
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error("Image generation request failed:", response.status, message);
      return res.status(502).json({ message: "Image generation request failed" });
    }

    const data = (await response.json()) as {
      data?: Array<{ url?: string }>;
    };
    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) {
      return res.status(502).json({ message: "Image service returned no image" });
    }

    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Image generation API error:", error);
    return res.status(500).json({ message: "Failed to generate image" });
  }
}
