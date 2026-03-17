import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export const useWeeklyTargetActions = ({
  onWeeklyTargetChange,
  weeklyConsistency,
}: {
  onWeeklyTargetChange?: (nextTarget: string) => Promise<void> | void;
  weeklyConsistency?: { target?: number | null } | null;
}) => {
  const [weeklyTargetDraft, setWeeklyTargetDraft] = useState(
    weeklyConsistency?.target ? String(weeklyConsistency.target) : ""
  );
  const [savingWeeklyTarget, setSavingWeeklyTarget] = useState(false);

  useEffect(() => {
    setWeeklyTargetDraft(weeklyConsistency?.target ? String(weeklyConsistency.target) : "");
  }, [weeklyConsistency?.target]);

  const handleWeeklyTargetChange = async (nextTarget: string) => {
    setWeeklyTargetDraft(nextTarget);
    if (!nextTarget || nextTarget === String(weeklyConsistency?.target || "")) {
      return;
    }

    try {
      setSavingWeeklyTarget(true);
      await onWeeklyTargetChange?.(nextTarget);
      toast.success("Weekly target updated");
    } catch (error) {
      console.error("Failed to save weekly target", error);
      setWeeklyTargetDraft(weeklyConsistency?.target ? String(weeklyConsistency.target) : "");
      toast.error("Couldn't update your weekly target");
    } finally {
      setSavingWeeklyTarget(false);
    }
  };

  return {
    weeklyTargetDraft,
    savingWeeklyTarget,
    handleWeeklyTargetChange,
  };
};
