import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const API_BASE_URL = "https://exercisedb.p.rapidapi.com";
const HEADERS = {
  "x-rapidapi-host": process.env.NEXT_PUBLIC_RAPIDAPI_HOST,
  "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, param } = req.query;

  if (!type) {
    return res.status(400).json({ error: "Missing type parameter" });
  }

  let endpoint: string;

  try {
    switch (type) {
      case "all":
        endpoint = `${API_BASE_URL}/exercises?limit=10&offset=0`;
        break;
      case "bodyPart":
        if (!param)
          return res.status(400).json({ error: "Missing param for bodyPart" });
        endpoint = `${API_BASE_URL}/exercises/bodyPart/${param}?limit=10&offset=0`;
        break;
      case "equipment":
        if (!param)
          return res.status(400).json({ error: "Missing param for equipment" });
        endpoint = `${API_BASE_URL}/exercises/equipment/${param}?limit=10&offset=0`;
        break;
      case "target":
        if (!param)
          return res.status(400).json({ error: "Missing param for target" });
        endpoint = `${API_BASE_URL}/exercises/target/${param}?limit=10&offset=0`;
        break;
      case "name":
        if (!param)
          return res.status(400).json({ error: "Missing param for name" });
        endpoint = `${API_BASE_URL}/exercises/name/${param}?limit=10&offset=0`;
        break;
      case "id":
        if (!param)
          return res.status(400).json({ error: "Missing param for id" });
        endpoint = `${API_BASE_URL}/exercises/exercise/${param}`;
        break;
      case "bodyPartList":
        endpoint = `${API_BASE_URL}/exercises/bodyPartList`;
        break;
      case "equipmentList":
        endpoint = `${API_BASE_URL}/exercises/equipmentList`;
        break;
      case "targetList":
        endpoint = `${API_BASE_URL}/exercises/targetList`;
        break;
      default:
        return res.status(400).json({ error: "Invalid type parameter" });
    }

    const response = await axios.get(endpoint, { headers: HEADERS });
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error(
      "Error fetching data:",
      error.response?.data || error.message
    );
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || "Failed to fetch data from ExerciseDB",
    });
  }
}
