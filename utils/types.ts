import { ObjectId } from "mongodb";

export interface ExerciseSet {
  name: string;
  reps?: number;
  percentage?: number;
  weight?: number;
  actualReps?: string;
  actualWeight?: string;
  seconds?: number;
  actualSeconds?: string;
  minutes?: number;
  actualMinutes?: string;
  hours?: number;
  actualHours?: string;
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
