export const saveExerciseRecommendationFeedback = async (payload: {
  userId: string;
  exerciseId: string;
  exerciseName?: string;
  feedback: "too_easy" | "about_right" | "too_hard";
  recommendedWeight?: number | null;
  recommendedReps?: number | null;
  recommendedSets?: number | null;
  weightUnit?: "lb" | "kg";
  recommendationReason?: string;
  basedOnDate?: string | null;
}) => {
  const response = await fetch("/api/exerciseRecommendationFeedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`saveExerciseRecommendationFeedback ${response.status}: ${message}`);
  }

  return response.json();
};
