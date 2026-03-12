import { ObjectId } from "mongodb";

export interface ExerciseSet {
  name: string;
  reps?: number;
  percentage?: number;
  weight?: number;
  actualReps?: number | string;
  actualWeight?: number | string;
  seconds?: number;
  actualSeconds?: number | string;
  minutes?: number;
  actualMinutes?: number | string;
  hours?: number;
  actualHours?: number | string;
  totalSeconds?: number | string;
  complete?: boolean;
  completedDate?: Date | string;
}

export interface Exercise {
  name: string;
  type: "timed" | "weight";
  max?: number;
  rest: number;
  complete: boolean;
  sets: ExerciseSet[];
}

interface Day {
  title: string;
  complete?: boolean;
  exercises: Exercise[];
}

export interface Routine {
  name: string;
  description: string;
  days: {
    sunday: Day;
    monday: Day;
    tuesday: Day;
    wednesday: Day;
    thursday: Day;
    friday: Day;
    saturday: Day;
  };
}

export interface ExerciseCatalogDoc {
  _id?: ObjectId;
  name: string;
  type: "weight" | "timed";
  defaultMax?: number;
  videoUrl?: string;
  muscleGroup?: string;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RecurringRuleDoc {
  _id?: ObjectId;
  userId: string;
  exerciseId: ObjectId | string;
  routineName: string;
  dayOfWeek: number;
  intervalWeeks: number;
  startDate: Date;
  endDate?: Date;
  templateSets?: ExerciseSet[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkoutEntryDoc {
  _id?: ObjectId;
  userId: string;
  exerciseId: ObjectId | string;
  name?: string;
  type?: "timed" | "weight";
  max?: number;
  routineName: string;
  date: Date;
  rest?: number;
  complete?: boolean;
  sets?: ExerciseSet[];
  ruleId?: string;
  skipped?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
