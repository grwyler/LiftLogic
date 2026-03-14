type ExerciseSeed = {
  name: string;
  type: "weight" | "timed";
  sets: [];
  equipment: string[];
  bodyPart?: string;
  target?: string;
  aliases?: string[];
  description?: string;
};

const weightExercise = (
  name: string,
  bodyPart: string,
  target: string,
  equipment: string[],
  aliases: string[] = [],
  description = ""
): ExerciseSeed => ({
  name,
  type: "weight",
  sets: [],
  equipment,
  bodyPart,
  target,
  aliases,
  description,
});

const timedExercise = (
  name: string,
  bodyPart: string,
  target: string,
  equipment: string[],
  aliases: string[] = [],
  description = ""
): ExerciseSeed => ({
  name,
  type: "timed",
  sets: [],
  equipment,
  bodyPart,
  target,
  aliases,
  description,
});

export const initialExercises: ExerciseSeed[] = [
  weightExercise("Back Squat", "legs", "quads", ["Barbell", "Squat Rack"], ["squat", "barbell squat"], "Classic lower-body compound lift."),
  weightExercise("Front Squat", "legs", "quads", ["Barbell", "Squat Rack"], ["clean grip squat"], "Quad-dominant squat variation."),
  weightExercise("Goblet Squat", "legs", "quads", ["Dumbbells", "Kettlebell"], ["db squat", "kettlebell squat"], "Great squat variation for beginners and home gyms."),
  weightExercise("Leg Press", "legs", "quads", ["Leg Press Machine"], ["sled press"], "Machine-based lower-body press."),
  weightExercise("Romanian Deadlift", "legs", "hamstrings", ["Barbell", "Dumbbells"], ["rdl"], "Hip hinge for posterior-chain strength."),
  weightExercise("Deadlift", "legs", "posterior chain", ["Barbell"], ["conventional deadlift"], "Heavy full-body pull from the floor."),
  weightExercise("Trap Bar Deadlift", "legs", "posterior chain", ["Trap Bar"], ["hex bar deadlift"], "Deadlift variation with a more upright torso."),
  weightExercise("Hip Thrust", "legs", "glutes", ["Barbell", "Bench"], ["barbell hip thrust", "glute thrust"], "Glute-focused strength movement."),
  weightExercise("Bulgarian Split Squat", "legs", "glutes", ["Dumbbells", "Bench"], ["bss", "rear foot elevated split squat"], "Single-leg squat variation."),
  weightExercise("Walking Lunge", "legs", "glutes", ["Dumbbells"], ["lunge"], "Unilateral leg movement for strength and control."),
  weightExercise("Step-Up", "legs", "glutes", ["Dumbbells", "Bench"], ["box step up"], "Single-leg movement for strength and balance."),
  weightExercise("Leg Extension", "legs", "quads", ["Leg Extension Machine"], ["quad extension"], "Isolation work for the quads."),
  weightExercise("Hamstring Curl", "legs", "hamstrings", ["Leg Curl Machine"], ["leg curl", "ham curl"], "Machine hamstring isolation."),
  weightExercise("Seated Calf Raise", "legs", "calves", ["Calf Raise Machine"], ["calf raise"], "Calf isolation through full range."),
  weightExercise("Bench Press", "push", "chest", ["Barbell", "Bench"], ["barbell bench", "flat bench"], "Classic horizontal pressing lift."),
  weightExercise("Incline Bench Press", "push", "upper chest", ["Barbell", "Bench"], ["incline bench"], "Upper-chest focused pressing."),
  weightExercise("Dumbbell Bench Press", "push", "chest", ["Dumbbells", "Bench"], ["db bench"], "Stable chest press with dumbbells."),
  weightExercise("Dumbbell Floor Press", "push", "chest", ["Dumbbells"], ["floor press", "db floor press"], "Bench-free horizontal press for home setups."),
  weightExercise("Push-Up", "push", "chest", ["Bodyweight"], ["push up"], "Bodyweight pressing staple."),
  weightExercise("Weighted Dip", "push", "triceps", ["Dip Bars"], ["dip"], "Heavy bodyweight pressing movement."),
  weightExercise("Chest Fly", "push", "chest", ["Dumbbells", "Cable Machine", "Chest Fly Machine"], ["fly", "pec fly"], "Chest isolation movement."),
  weightExercise("Cable Crossover", "push", "chest", ["Cable Machine"], ["cable fly"], "Cable chest isolation through a long range."),
  weightExercise("Overhead Press", "shoulders", "shoulders", ["Barbell"], ["ohp", "standing press", "shoulder press"], "Vertical pressing strength lift."),
  weightExercise("Standing Dumbbell Shoulder Press", "shoulders", "shoulders", ["Dumbbells"], ["standing dumbbell press", "standing db press"], "Bench-free dumbbell overhead press."),
  weightExercise("Seated Dumbbell Shoulder Press", "shoulders", "shoulders", ["Dumbbells", "Bench"], ["db shoulder press"], "Dumbbell overhead pressing variation."),
  weightExercise("Lateral Raise", "shoulders", "side delts", ["Dumbbells", "Cable Machine"], ["side raise"], "Shoulder isolation for the side delts."),
  weightExercise("Rear Delt Fly", "shoulders", "rear delts", ["Dumbbells", "Cable Machine"], ["reverse fly"], "Upper-back and rear-delt isolation."),
  weightExercise("Barbell Row", "pull", "back", ["Barbell"], ["bent over row", "barbell bent row"], "Heavy horizontal pulling movement."),
  weightExercise("One-Arm Dumbbell Row", "pull", "back", ["Dumbbells"], ["one arm row", "db row"], "Home-friendly row variation with a dumbbell."),
  weightExercise("Chest-Supported Row", "pull", "back", ["Dumbbells", "Machine", "Bench"], ["supported row"], "Upper-back focused row with support."),
  weightExercise("Seated Cable Row", "pull", "back", ["Cable Machine"], ["cable row"], "Cable rowing movement for lats and mid-back."),
  weightExercise("Lat Pulldown", "pull", "lats", ["Cable Machine"], ["pulldown"], "Vertical pulling pattern for the lats."),
  weightExercise("Pull-Up", "pull", "lats", ["Pull-Up Bar"], ["pull up", "chin-up"], "Bodyweight vertical pulling movement."),
  weightExercise("Assisted Pull-Up", "pull", "lats", ["Assisted Pull-Up Machine"], ["banded pull-up"], "Accessible pull-up variation."),
  weightExercise("Face Pull", "pull", "rear delts", ["Cable Machine"], ["rope face pull"], "Upper-back and shoulder health movement."),
  weightExercise("Shrug", "pull", "traps", ["Barbell", "Dumbbells"], ["trap shrug"], "Upper-trap focused movement."),
  weightExercise("Barbell Curl", "pull", "biceps", ["Barbell"], ["curl", "bb curl"], "Biceps staple."),
  weightExercise("Hammer Curl", "pull", "biceps", ["Dumbbells"], ["db hammer curl"], "Biceps and brachialis focus."),
  weightExercise("Preacher Curl", "pull", "biceps", ["EZ Curl Bar", "Preacher Bench"], ["ez curl preacher"], "Strict biceps variation."),
  weightExercise("Triceps Pushdown", "push", "triceps", ["Cable Machine"], ["pushdown", "rope pushdown"], "Cable triceps isolation."),
  weightExercise("Overhead Dumbbell Triceps Extension", "push", "triceps", ["Dumbbells"], ["db triceps extension", "overhead triceps extension"], "Simple triceps isolation for a single dumbbell."),
  weightExercise("Skullcrusher", "push", "triceps", ["EZ Curl Bar", "Bench"], ["lying triceps extension"], "Triceps extension variation."),
  weightExercise("Close-Grip Bench Press", "push", "triceps", ["Barbell", "Bench"], ["cgbp"], "Bench variation with more triceps emphasis."),
  weightExercise("Farmer Carry", "core", "grip", ["Dumbbells", "Trap Bar"], ["loaded carry"], "Carry for grip, core, and conditioning."),
  weightExercise("Hanging Leg Raise", "core", "abs", ["Pull-Up Bar"], ["leg raise"], "Core movement with a hanging position."),
  weightExercise("Cable Crunch", "core", "abs", ["Cable Machine"], ["rope crunch"], "Weighted abdominal flexion."),
  timedExercise("Dead Hang", "pull", "lats", ["Pull-Up Bar"], ["dead hang", "bar hang", "passive hang"], "Timed hanging hold for grip endurance, shoulder comfort, and upper-body support."),
  timedExercise("Plank", "core", "core", ["Bodyweight"], ["front plank"], "Simple timed core hold."),
  timedExercise("Side Plank", "core", "obliques", ["Bodyweight"], ["lateral plank"], "Timed core hold for the obliques."),
  timedExercise("Dead Bug", "core", "core", ["Bodyweight"], ["deadbug"], "Controlled core drill."),
  timedExercise("Dynamic Stretching Routine", "mobility", "mobility", ["Bodyweight"], ["warm up", "warm-up"], "General dynamic warm-up sequence."),
  timedExercise("Mobility Flow", "mobility", "mobility", ["Bodyweight", "Yoga Mat"], ["mobility routine"], "Short movement prep flow."),
  timedExercise("Cycling", "conditioning", "conditioning", ["Bicycle", "Stationary Bike"], ["bike", "spin"], "Steady-state or interval cardio."),
  timedExercise("Running", "conditioning", "conditioning", ["Bodyweight", "Treadmill"], ["run", "jog"], "Run outdoors or on a treadmill."),
  timedExercise("Rowing", "conditioning", "conditioning", ["Rowing Machine"], ["erg", "rower"], "Full-body cardio on a rower."),
  timedExercise("Jump Rope", "conditioning", "conditioning", ["Jump Rope"], ["skipping rope"], "Simple conditioning and footwork drill."),
  timedExercise("Stair Climber", "conditioning", "conditioning", ["Stair Climber"], ["stairs"], "Steady-state lower-body cardio."),
  timedExercise("Elliptical", "conditioning", "conditioning", ["Elliptical"], ["cross trainer"], "Low-impact conditioning option."),
  timedExercise("Yoga", "mobility", "mobility", ["Yoga Mat"], ["flow yoga", "stretch"], "Longer recovery or mobility-focused session."),
];

export const equipment = Array.from(
  new Set(initialExercises.flatMap((exercise) => exercise.equipment))
).sort();
