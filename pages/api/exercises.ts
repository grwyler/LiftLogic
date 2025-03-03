import axios from "axios";

const API_BASE_URL = "https://exercisedb.p.rapidapi.com";
const HEADERS = {
  "x-rapidapi-host": process.env.NEXT_PUBLIC_RAPIDAPI_HOST,
  "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
};

export default async function handler(req, res) {
  const { query } = req;
  const { type, param } = query; // `type` determines the API call (e.g., 'bodyPart', 'equipment', etc.)

  let endpoint;

  try {
    switch (type) {
      case "all":
        endpoint = `${API_BASE_URL}/exercises?limit=10&offset=0`;
        break;
      case "bodyPart":
        endpoint = `${API_BASE_URL}/exercises/bodyPart/${param}?limit=10&offset=0`;
        break;
      case "equipment":
        endpoint = `${API_BASE_URL}/exercises/equipment/${param}?limit=10&offset=0`;
        break;
      case "target":
        endpoint = `${API_BASE_URL}/exercises/target/${param}?limit=10&offset=0`;
        break;
      case "name":
        endpoint = `${API_BASE_URL}/exercises/name/${param}?limit=10&offset=0`;
        break;
      case "id":
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
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error fetching data:",
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Failed to fetch data from ExerciseDB",
    });
  }
}
