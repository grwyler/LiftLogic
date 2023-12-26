export const initialWorkouts = [
  {
    id: 1,
    name: "Primary",
  },
];

export const routines = {
  "1": {
    sunday: {
      title: "Mobility and Active Recovery",
      exercises: [
        {
          name: "Dynamic Stretching Routine",
          type: "timed",
          sets: [{ name: "Stretch and Foam Roll", seconds: 600 }],
        },
      ],
    },
    monday: { title: "Jiu-Jitsu Anvil", exercises: [] },
    tuesday: {
      title: "Strength Training",
      complete: false,
      exercises: [
        {
          name: "Squats",
          type: "weight",
          max: 315,
          rest: 120,
          complete: false,
          sets: [
            {
              name: "Warm-up set 1",
              reps: 10,
              percentage: 0.5,
              actualReps: "",
              actualWeight: "",
              weight: 315 * 0.5,
            },
            {
              name: "Warm-up set 2",
              reps: 10,
              percentage: 0.6,
              actualReps: "",
              actualWeight: "",
              weight: 315 * 0.6,
            },
            {
              name: "Working set 1",
              reps: 6,
              percentage: 0.75,
              actualReps: "",
              actualWeight: "",
              weight: 315 * 0.75,
            },
            {
              name: "Working set 2",
              reps: 6,
              percentage: 0.78,
              actualReps: "",
              actualWeight: "",
              weight: 315 * 0.78,
            },
            {
              name: "Working set 3",
              reps: 6,
              percentage: 0.82,
              actualReps: "",
              actualWeight: "",
              weight: 315 * 0.82,
            },
            {
              name: "Working set 4",
              reps: 6,
              percentage: 0.85,
              actualReps: "",
              actualWeight: "",
              weight: 315 * 0.85,
            },
          ],
        },
        {
          name: "Bench Press",
          type: "weight",
          max: 225,
          rest: 120,
          complete: false,
          sets: [
            {
              name: "Warm-up set 1",
              reps: 10,
              percentage: 0.5,
              actualReps: "",
              actualWeight: "",
              weight: 225 * 0.5,
            },
            {
              name: "Warm-up set 2",
              reps: 10,
              percentage: 0.6,
              actualReps: "",
              actualWeight: "",
              weight: 225 * 0.6,
            },
            {
              name: "Working set 1",
              reps: 6,
              percentage: 0.75,
              actualReps: "",
              actualWeight: "",
              weight: 225 * 0.75,
            },
            {
              name: "Working set 2",
              reps: 6,
              percentage: 0.78,
              actualReps: "",
              actualWeight: "",
              weight: 225 * 0.78,
            },
            {
              name: "Working set 3",
              reps: 6,
              percentage: 0.82,
              actualReps: "",
              actualWeight: "",
              weight: 225 * 0.82,
            },
            {
              name: "Working set 4",
              reps: 6,
              percentage: 0.85,
              actualReps: "",
              actualWeight: "",
              weight: 225 * 0.85,
            },
          ],
        },
        {
          name: "Bent Over Rows",
          type: "weight",
          max: 155,
          rest: 120,
          complete: false,
          sets: [
            {
              name: "Working set 1",
              reps: 10,
              percentage: 0.75,
              actualReps: "",
              actualWeight: "",
              weight: 155 * 0.75,
            },
            {
              name: "Working set 2",
              reps: 10,
              percentage: 0.78,
              actualReps: "",
              actualWeight: "",
              weight: 155 * 0.78,
            },
            {
              name: "Working set 3",
              reps: 10,
              percentage: 0.82,
              actualReps: "",
              actualWeight: "",
              weight: 155 * 0.82,
            },
          ],
        },
        {
          name: "Lunges",
          type: "weight",
          max: 155,
          rest: 120,
          complete: false,
          sets: [
            {
              name: "Working set 1",
              reps: 10,
              percentage: 0.75,
              actualReps: "",
              actualWeight: "",
              weight: 155 * 0.75,
            },
            {
              name: "Working set 2",
              reps: 10,
              percentage: 0.78,
              actualReps: "",
              actualWeight: "",
              weight: 155 * 0.78,
            },
            {
              name: "Working set 3",
              reps: 10,
              percentage: 0.82,
              actualReps: "",
              actualWeight: "",
              weight: 155 * 0.82,
            },
          ],
        },
      ],
    },
    wednesday: { title: "Jiu-Jitsu Anvil", exercises: [] },
    thursday: {
      title: "Strength Training",
      exercises: [
        {
          name: "Deadlifts",
          type: "weight",
          max: 405,
          rest: 120,
          complete: false,
          sets: [
            {
              name: "Warm-up set 1",
              reps: 10,
              percentage: 0.5,
            },
            {
              name: "Warm-up set 2",
              reps: 10,
              percentage: 0.6,
            },
            {
              name: "Working set 1",
              reps: 6,
              percentage: 0.75,
            },
            {
              name: "Working set 2",
              reps: 6,
              percentage: 0.78,
            },
            {
              name: "Working set 3",
              reps: 6,
              percentage: 0.82,
            },
            {
              name: "Working set 4",
              reps: 6,
              percentage: 0.85,
            },
          ],
        },
        {
          name: "Overhead Press",
          type: "weight",
          max: 145,
          rest: 120,
          complete: false,
          sets: [
            { name: "Warm-up set 1", reps: 10, percentage: 0.5 },
            { name: "Warm-up set 2", reps: 10, percentage: 0.6 },
            { name: "Working set 1", reps: 6, percentage: 0.75 },
            { name: "Working set 2", reps: 6, percentage: 0.78 },
            { name: "Working set 3", reps: 6, percentage: 0.82 },
            { name: "Working set 4", reps: 6, percentage: 0.85 },
          ],
        },
        {
          name: "Pull-Ups",
          type: "weight",
          max: 35,
          rest: 120,
          complete: false,
          sets: [
            { name: "Working set 1", reps: 10, percentage: 0.75 },
            { name: "Working set 2", reps: 10, percentage: 0.78 },
            { name: "Working set 3", reps: 10, percentage: 0.82 },
          ],
        },
        {
          name: "Bulgarian Split Squats",
          type: "weight",
          max: 45,
          rest: 120,
          complete: false,
          sets: [
            { name: "Working set 1", reps: 10, percentage: 0.75 },
            { name: "Working set 2", reps: 10, percentage: 0.78 },
            { name: "Working set 3", reps: 10, percentage: 0.82 },
          ],
        },
        {
          name: "Planks",
          type: "timed",
          rest: 30,
          complete: false,
          sets: [
            { name: "Working set 1", seconds: 60 },
            { name: "Working set 2", seconds: 60 },
            { name: "Working set 3", seconds: 60 },
          ],
        },
      ],
    },
    friday: { title: "Rest and Recovery", exercises: [] },
    saturday: { title: "Jiu-Jitsu Open Mat", exercises: [] },
  },
};