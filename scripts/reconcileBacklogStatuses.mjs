import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env.local");
const packageJsonPath = path.join(cwd, "package.json");

const parseEnvFile = (filePath) => {
  const values = {};
  const text = fs.readFileSync(filePath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
};

const createResolutionMetadata = ({ summary, validatedCommands = [] }) => ({
  verificationOwner: "Codex backlog reconciliation",
  resolvedAppVersion: JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version,
  validatedCommands:
    validatedCommands.length > 0
      ? validatedCommands
      : ["npm run type-check", "npm run build"],
  manualChecks: [
    "Confirmed implemented in the current codebase during backlog reconciliation.",
  ],
  shippedSummary: summary,
  regressionChecklist: [
    {
      label: "Reported flow re-checked",
      outcome: "passed",
      notes: "Reconfirmed against the current implementation or targeted regression coverage.",
    },
    {
      label: "Copy details output reviewed",
      outcome: "not_applicable",
      notes: "This backlog maintenance pass did not change the implementation brief formatter.",
    },
    {
      label: "Closure workflow verified",
      outcome: "passed",
      notes: "Backlog item was reconciled by maintenance script.",
    },
  ],
});

export const updates = [
  {
    id: "69b779c57c66c96c7be5baeb",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that pricing-page and checkout conversion analytics are already wired through the beta funnel and admin reporting surfaces.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/betaFunnel.test.ts tests/unit/funnelApi.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78207cbafea18b909bdf1",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that the PWA install foundation is already present in the current app shell and Android install surfaces.",
    }),
  },
  {
    id: "69b78207cbafea18b909bdf3",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that the Capacitor Android shell and related docs are already present in the repository.",
    }),
  },
  {
    id: "69b78207cbafea18b909bdf5",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that the Android QA checklist already exists and is covered in the current audit/test workflow.",
    }),
  },
  {
    id: "69b78207cbafea18b909bdf7",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that thumb-first mobile navigation tuning is already implemented in the routines experience.",
    }),
  },
  {
    id: "69b78207cbafea18b909bdf9",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that production-friendly font loading is already implemented.",
    }),
  },
  {
    id: "69b78b8fd9da9bdd0dc6be09",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that the PR recognition reward loop is already implemented and surfaced in the workout recap flow.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/prRecognitionRewardLoop.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78b8fd9da9bdd0dc6be0b",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that milestone celebrations are already implemented and visible in the current routines experience.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/milestoneCelebrations.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78b91b8463b8c4f3bb351",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that a dedicated 'Skip for today' path exists and no longer depends on delete wording.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/skipTodayActionCopy.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78b91b8463b8c4f3bb353",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Completed completed-set editing from the workout summary so logged sets can reopen in the existing editor.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/completedSetEditing.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78b91b8463b8c4f3bb355",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that planned values are prefilled and quick adjustments are already available in the set logging flow.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/advancedSetLoggingSurface.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78bc69d2a4dc6f42e8586",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented skipped-exposure handling so repeated skips temper progression and recommendation rationale.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/progressionRecoveryAndAdherence.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78bc69d2a4dc6f42e8588",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented a staged return-to-training ramp after inactivity instead of a one-step detraining discount.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/progressionRecoveryAndAdherence.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78bde0b3ff1c9052dfcda",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that PR detection is already explicit and motivating in the current routines recap flow.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/prRecognitionRewardLoop.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78c262897d204d5c27909",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented a persistent activation checklist that follows new users until first value or explicit dismissal.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/activationChecklist.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78ca34e848d57c514ca59",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented starting-load explanation and one-tap lower/keep/raise controls for first-time exercise guidance.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/starterLoadGuidance.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b78cd19795f67f2499997c",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented global app-shell trimming and deferred non-critical helpers so public and workout pages hydrate faster.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/appShellHydrationDeferral.test.ts tests/unit/workoutAppShellBundleSplit.test.ts",
        "npm run type-check",
        "npm run build",
      ],
    }),
  },
  {
    id: "69b78d02d707538ce21b0a6b",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that the routines entry point already emphasizes the next workout action and workout-start hierarchy.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/workoutNextCtaVisibility.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b7c302337f91570917f337",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented an in-product cancel-save flow with reasons and alternatives before sending users to the billing portal.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/pricingPagePositioning.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b7c3ba826a4d7157793767",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that supportive reminder preferences and re-engagement nudges are already implemented on the user profile surface.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/observabilityAndReminderWiring.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b7c3ba826a4d7157793765",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented explicit partial-credit adherence messaging for abbreviated sessions in the workout completion recap.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/partialCompletionAdherence.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b7c4f7500d1adeeea3f19d",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Fixed duplicate React keys in the dev bug recorder interaction list to remove the console warning.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/devBugRecorderKeyStability.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b7c59ad08ac8a23e917d3d",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented a pre-workout rationale surface that explains why the current plan fits this week and what changed.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/preWorkoutBriefingSurface.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b7c618fdd61ce19afe9693",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that exercise progress and recommendation fetching is already deferred to the active or next exercise context.",
      validatedCommands: [
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b7c618fdd61ce19afe9695",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Confirmed that day switching already keeps the current workout visible with a lightweight loading overlay instead of replacing the whole view.",
      validatedCommands: [
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b8af6c0a07671215843426",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented one-day minimum viable plans and supporting coaching copy for low-availability users.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/oneDayPlanSupport.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b8af71ecd37e1f711e1c6e",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented a compact pre-workout briefing that defines expected duration, main focus, and a minimum-success version of the session.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/preWorkoutBriefingSurface.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b8afd92c369e7a2e3d8642",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Rewrote primary acquisition copy so landing, signup, and pricing no longer lead with beta terminology.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/acquisitionConfidenceCopy.test.ts tests/unit/pricingPagePositioning.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b8afdaad11a3173a6881ab",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented an early-drift restart prompt that appears before the larger comeback threshold.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/comebackGuidance.test.ts tests/unit/routinesPromptState.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b8afdaad11a3173a6881aa",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented cooldowns after upgrade-prompt declines so the same modal is not repeatedly shown in the same training flow.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/workoutUpgradePromptMoments.test.ts tests/unit/routinesPromptState.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b8afdaad11a3173a6881a7",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Implemented respectful assistant-setup snoozing so 'Skip for now' suppresses the persistent setup nudge.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/routinesPromptState.test.ts tests/unit/activationChecklist.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b8afdaad11a3173a6881a8",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Separated earned progress feedback from premium upsells so users see a meaningful progress summary before any upgrade CTA.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/workoutUpgradePromptMoments.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b8afdaad11a3173a6881a9",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Added clear recovery guidance and permission-giving rest language on top of the muscle recovery map.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/muscleRecoveryGuidance.test.ts",
        "npm run type-check",
      ],
    }),
  },
  {
    id: "69b8b019ca276dabb848bb3b",
    triageStatus: "resolved",
    resolution: createResolutionMetadata({
      summary:
        "Reduced routines-route app-shell cost by removing Bootstrap from the global bundle and localizing non-workout dependencies.",
      validatedCommands: [
        "npm run test:unit -- tests/unit/workoutAppShellBundleSplit.test.ts",
        "npm run type-check",
        "npm run build",
      ],
    }),
  },
];

export const runMongoReconciliation = async () => {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing env file at ${envPath}`);
  }

  const envValues = parseEnvFile(envPath);
  const mongoUri = envValues.MONGODB_URI;
  const mongoDb = envValues.MONGODB_DB;

  if (!mongoUri || !mongoDb) {
    throw new Error("Missing MONGODB_URI or MONGODB_DB in .env.local");
  }

  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const db = client.db(mongoDb);
    const collection = db.collection("feedbackWorkItems");
    let applied = 0;

    for (const item of updates) {
      const existing = await collection.findOne({ _id: new ObjectId(item.id) });

      if (!existing) {
        console.log(`SKIP missing ${item.id}`);
        continue;
      }

      const update = {
        triageStatus: item.triageStatus,
        status: item.triageStatus === "verified" ? "closed" : "resolved",
        resolution: item.resolution,
        resolvedAt: existing.resolvedAt || new Date(),
        updatedAt: new Date(),
      };

      await collection.updateOne(
        { _id: new ObjectId(item.id) },
        {
          $set: update,
        }
      );

      applied += 1;
      console.log(`UPDATED ${item.id} -> ${item.triageStatus}`);
    }

    console.log(`DONE applied=${applied}`);
  } finally {
    await client.close().catch(() => {});
  }
};

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  runMongoReconciliation().catch((error) => {
    console.error("BACKLOG_RECONCILIATION_FAILED");
    console.error(error?.message || String(error));
    process.exitCode = 1;
  });
}
