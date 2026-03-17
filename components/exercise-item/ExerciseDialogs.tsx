import React from "react";
import DeleteDialog from "../DeleteDialog";
import SkipTodayDialog from "../SkipTodayDialog";
import RepeatScheduleDialog from "../RepeatScheduleDialog";

const ExerciseDialogs = ({
  showDeleteDialog,
  setShowDeleteDialog,
  handleDelete,
  formattedDate,
  showSkipTodayDialog,
  setShowSkipTodayDialog,
  handleSkipToday,
  isRepeating,
  showRepeatDialog,
  setShowRepeatDialog,
  handleSaveRepeatSchedule,
  handleDisableRepeat,
  recurrenceType,
  setRecurrenceType,
  repeatInterval,
  setRepeatInterval,
  repeatDayOfWeek,
  setRepeatDayOfWeek,
  repeatDaysOfWeek,
  setRepeatDaysOfWeek,
  repeatDayOfMonth,
  setRepeatDayOfMonth,
  repeatEndDate,
  setRepeatEndDate,
}) => (
  <>
    <DeleteDialog
      open={showDeleteDialog}
      onClose={() => setShowDeleteDialog(false)}
      onDeleteAll={() => {
        handleDelete("all");
        setShowDeleteDialog(false);
      }}
      targetDate={formattedDate}
    />
    <SkipTodayDialog
      open={showSkipTodayDialog}
      onClose={() => setShowSkipTodayDialog(false)}
      onSkipToday={handleSkipToday}
      targetDate={formattedDate}
      isRepeating={isRepeating}
    />
    <RepeatScheduleDialog
      open={showRepeatDialog}
      onClose={() => setShowRepeatDialog(false)}
      onSave={handleSaveRepeatSchedule}
      onDisable={isRepeating ? handleDisableRepeat : undefined}
      isRepeating={isRepeating}
      recurrenceType={recurrenceType}
      setRecurrenceType={setRecurrenceType}
      interval={repeatInterval}
      setInterval={setRepeatInterval}
      dayOfWeek={repeatDayOfWeek}
      setDayOfWeek={setRepeatDayOfWeek}
      daysOfWeek={repeatDaysOfWeek}
      setDaysOfWeek={setRepeatDaysOfWeek}
      dayOfMonth={repeatDayOfMonth}
      setDayOfMonth={setRepeatDayOfMonth}
      endDate={repeatEndDate}
      setEndDate={setRepeatEndDate}
    />
  </>
);

export default ExerciseDialogs;
