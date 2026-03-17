import { describe, expect, it } from "vitest";
import {
  CODEX_COPY_BRIEF_SECTIONS,
  buildCodexCopyText,
  getFeedbackEvidenceForWorkItem,
  getRelatedWorkItems,
  sortFeedbackEvidence,
  summarizeBugReportEvidence,
} from "../../utils/feedbackDetails";
import { FeedbackItemDoc, FeedbackWorkItemDoc } from "../../utils/types";

describe("feedback details helpers", () => {
  it("returns only reports linked to the selected work item, newest first", () => {
    const workItem = {
      _id: "work-1",
      type: "bug",
      title: "Workout log failed",
      latestDescription: "Latest description",
      fingerprint: "wrk_1",
      occurrenceCount: 2,
      triageStatus: "new",
    } as unknown as FeedbackWorkItemDoc;

    const feedbackItems = [
      {
        _id: "fb-older",
        workItemId: "work-1",
        type: "bug",
        userId: "user-1",
        title: "Older report",
        description: "Older",
        createdAt: "2026-03-14T10:00:00.000Z",
      },
      {
        _id: "fb-other",
        workItemId: "work-2",
        type: "bug",
        userId: "user-1",
        title: "Other report",
        description: "Other",
        createdAt: "2026-03-14T12:00:00.000Z",
      },
      {
        _id: "fb-newer",
        workItemId: "work-1",
        type: "bug",
        userId: "user-1",
        title: "Newer report",
        description: "Newer",
        createdAt: "2026-03-14T11:00:00.000Z",
      },
    ] as unknown as FeedbackItemDoc[];

    expect(
      getFeedbackEvidenceForWorkItem({ workItem, feedbackItems }).map((item) =>
        String(item._id)
      )
    ).toEqual(["fb-newer", "fb-older"]);
  });

  it("sorts evidence by createdAt and then updatedAt", () => {
    const sorted = sortFeedbackEvidence([
      {
        _id: "fb-1",
        type: "bug",
        userId: "user-1",
        title: "A",
        description: "A",
        createdAt: "2026-03-14T11:00:00.000Z",
        updatedAt: "2026-03-14T11:01:00.000Z",
      },
      {
        _id: "fb-2",
        type: "bug",
        userId: "user-1",
        title: "B",
        description: "B",
        createdAt: "2026-03-14T11:00:00.000Z",
        updatedAt: "2026-03-14T11:03:00.000Z",
      },
    ] as unknown as FeedbackItemDoc[]);

    expect(sorted.map((item) => String(item._id))).toEqual(["fb-2", "fb-1"]);
  });

  it("summarizes recorded bug evidence into triage-friendly buckets", () => {
    const summary = summarizeBugReportEvidence({
      _id: "fb-1",
      type: "bug",
      userId: "user-1",
      title: "Workout log failed",
      description: "Recorded repro",
      bugReport: {
        mode: "recorded",
        interactions: [
          {
            timestamp: "2026-03-14T12:00:00.000Z",
            type: "lifecycle",
            page: "/routines",
            kind: "semantic",
            label: "Open logging flow",
          },
          {
            timestamp: "2026-03-14T12:00:05.000Z",
            type: "click",
            page: "/routines",
            kind: "raw",
            target: "button",
          },
        ],
        errors: [
          {
            timestamp: "2026-03-14T12:00:06.000Z",
            source: "window-error",
            page: "/routines",
            message: "saveWorkoutEntry 500",
          },
        ],
      },
    } as unknown as FeedbackItemDoc);

    expect(summary.errorCount).toBe(1);
    expect(summary.interactionCount).toBe(2);
    expect(summary.semanticSteps).toHaveLength(1);
    expect(summary.rawSteps).toHaveLength(1);
    expect(summary.latestError?.message).toBe("saveWorkoutEntry 500");
  });

  it("renders a stable implementation brief schema for copied work item details", () => {
    const workItem = {
      _id: "work-1",
      type: "bug",
      title: "Replace freeform Copy details output",
      latestDescription: [
        "Priority: P0",
        "Description: The current Copy details payload is still narrative-heavy.",
        "Workflow impact: Agents have to infer scope and verification details manually.",
        "Proposed fix: Emit a stable implementation brief schema.",
        "Acceptance criteria:",
        "- Copy details exports the same stable section order for every bug work item.",
        "- Empty required sections render TODO markers.",
      ].join("\n"),
      fingerprint: "wrk_1",
      occurrenceCount: 2,
      triageStatus: "new",
      page: "/bugs",
      structuredRepro: {
        actualBehavior: "The copied text is still freeform.",
        expectedBehavior: "The copied text should use a stable implementation brief schema.",
        reproSteps: ["Open /bugs", "Copy details for a work item"],
        affectedFlow: "/bugs",
      },
    } as unknown as FeedbackWorkItemDoc;

    const copyText = buildCodexCopyText({
      workItem,
      evidence: [],
    });

    expect(copyText).toContain("Implementation brief");
    expect(copyText).toContain("Schema version: implementation-brief-v1");
    expect(copyText).toContain("## Implementation context");
    expect(copyText).toContain("## Verification plan");
    expect(copyText).toContain("## Scope guardrails");
    expect(copyText).toContain("Confirmed links:");
    expect(copyText).toContain("[route] pages/bugs.tsx");

    let previousIndex = -1;
    CODEX_COPY_BRIEF_SECTIONS.forEach((section) => {
      const nextIndex = copyText.indexOf(`## ${section}`);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    });

    expect(copyText).toContain("Priority: P0");
    expect(copyText).toContain("Proposed fix: Emit a stable implementation brief schema.");
    expect(copyText).toContain("Acceptance check: Copy details exports the same stable section order for every bug work item.");
  });

  it("renders explicit TODO markers for missing required sections instead of omitting them", () => {
    const workItem = {
      _id: "work-2",
      type: "bug",
      title: "Minimal bug payload",
      latestDescription: "",
      fingerprint: "wrk_2",
      occurrenceCount: 1,
      triageStatus: "new",
    } as unknown as FeedbackWorkItemDoc;

    const copyText = buildCodexCopyText({
      workItem,
      evidence: [],
    });

    expect(copyText).toContain("## Actual behavior");
    expect(copyText).toContain("## Expected behavior");
    expect(copyText).toContain("## Likely files");
    expect(copyText).toContain("TODO: missing from the current work item.");
  });

  it("includes structured repro, start-here links, and verification items when present", () => {
    const workItem = {
      _id: "work-3",
      type: "bug",
      title: "Workflow detail panel is missing entry points",
      latestDescription: "Description: Add route-aware context.",
      fingerprint: "wrk_3",
      occurrenceCount: 1,
      triageStatus: "new",
      page: "/bugs",
      structuredRepro: {
        actualBehavior: "Codex has to search broadly before starting.",
        expectedBehavior: "The ticket should point to likely files immediately.",
        reproSteps: ["Open /bugs", "Read a work item"],
        affectedFlow: "/bugs",
      },
      implementationContext: {
        summary: "Bug triage starts on the bugs inbox and feedback helpers.",
        confirmed: [{ type: "route", path: "pages/bugs.tsx", label: "Bugs inbox" }],
        inferred: [{ type: "test", path: "tests/unit/bugsPage.test.ts", label: "Bugs page test" }],
      },
      verificationPack: {
        summary: "Run workflow checks and confirm the exported brief.",
        items: [
          {
            id: "command-bugs-tests",
            kind: "command",
            label: "Run bug workflow tests",
            command: "npm run test:unit -- tests/unit/bugsPage.test.ts",
          },
          {
            id: "manual-check-copy",
            kind: "manual",
            label: "Copy details and confirm the new sections are present.",
          },
        ],
      },
    } as unknown as FeedbackWorkItemDoc;

    const copyText = buildCodexCopyText({ workItem, evidence: [] });

    expect(copyText).toContain("Codex has to search broadly before starting.");
    expect(copyText).toContain("The ticket should point to likely files immediately.");
    expect(copyText).toContain("[route] pages/bugs.tsx | Bugs inbox");
    expect(copyText).toContain("npm run test:unit -- tests/unit/bugsPage.test.ts");
    expect(copyText).toContain("Copy details and confirm the new sections are present.");
  });

  it("finds related work using shared route, stack signature, and code-area clues", () => {
    const workItems = [
      {
        _id: "work-1",
        type: "bug",
        title: "Bugs page copy details misses related items",
        latestDescription: "Copy details omits similar work item history.",
        fingerprint: "wrk_primary",
        occurrenceCount: 1,
        triageStatus: "new",
        page: "/bugs",
        latestRuntimeContext: {
          route: "/bugs",
        },
      },
      {
        _id: "work-2",
        type: "bug",
        title: "Bugs page export skips duplicate context",
        latestDescription: "pages/bugs.tsx export hides related work.",
        fingerprint: "wrk_neighbor",
        occurrenceCount: 1,
        triageStatus: "resolved",
        page: "/bugs",
        latestRuntimeContext: {
          route: "/bugs",
        },
        resolvedAt: "2026-03-16T11:00:00.000Z",
      },
      {
        _id: "work-3",
        type: "bug",
        title: "Unrelated routines save error",
        latestDescription: "A different page broke.",
        fingerprint: "wrk_other",
        occurrenceCount: 1,
        triageStatus: "new",
        page: "/routines",
        latestRuntimeContext: {
          route: "/routines",
        },
      },
    ] as unknown as FeedbackWorkItemDoc[];

    const feedbackItems = [
      {
        _id: "fb-1",
        workItemId: "work-1",
        type: "bug",
        userId: "user-1",
        title: "Bugs page copy details misses related items",
        description: "The stack pointed to pages/bugs.tsx while opening the detail dialog.",
        page: "/bugs",
        runtimeContext: {
          route: "/bugs",
        },
        bugReport: {
          mode: "recorded",
          errors: [
            {
              timestamp: "2026-03-16T12:00:00.000Z",
              source: "window-error",
              page: "/bugs",
              message: "TypeError in pages/bugs.tsx while building related work",
            },
          ],
        },
      },
      {
        _id: "fb-2",
        workItemId: "work-2",
        type: "bug",
        userId: "user-1",
        title: "Bugs page export skips duplicate context",
        description: "Copy details failed near pages/bugs.tsx in the same dialog.",
        page: "/bugs",
        runtimeContext: {
          route: "/bugs",
        },
        bugReport: {
          mode: "recorded",
          errors: [
            {
              timestamp: "2026-03-16T13:00:00.000Z",
              source: "window-error",
              page: "/bugs",
              message: "TypeError in pages/bugs.tsx while building related work",
            },
          ],
        },
      },
      {
        _id: "fb-3",
        workItemId: "work-3",
        type: "bug",
        userId: "user-1",
        title: "Unrelated routines save error",
        description: "The routines page had a separate failure.",
        page: "/routines",
      },
    ] as unknown as FeedbackItemDoc[];

    const related = getRelatedWorkItems({
      workItem: workItems[0],
      workItems,
      feedbackItems,
    });

    expect(related).toHaveLength(1);
    expect(String(related[0].workItem._id)).toBe("work-2");
    expect(related[0].reasons.join(" | ")).toContain("shared route /bugs");
    expect(related[0].reasons.join(" | ")).toContain("shared stack/error signature");
    expect(related[0].reasons.join(" | ")).toContain("shared code area pages/bugs.tsx");
  });

  it("includes related work ids and matching reasons in copied details", () => {
    const workItem = {
      _id: "work-1",
      type: "bug",
      title: "Workout log failed",
      latestDescription: "Logging a set throws an error.",
      fingerprint: "wrk_1",
      occurrenceCount: 2,
      triageStatus: "new",
    } as unknown as FeedbackWorkItemDoc;

    const copyText = buildCodexCopyText({
      workItem,
      evidence: [],
      relatedWork: [
        {
          workItem: {
            _id: "work-9",
            type: "bug",
            title: "Earlier workout logging fix",
            latestDescription: "An earlier fix touched the same path.",
            fingerprint: "wrk_9",
            occurrenceCount: 1,
            triageStatus: "resolved",
            page: "/routines",
            resolvedAt: "2026-03-16T09:00:00.000Z",
          } as unknown as FeedbackWorkItemDoc,
          score: 9,
          reasons: ["shared route /routines", "shared code area pages/api/workoutEntry"],
        },
      ],
    });

    expect(copyText).toContain("Related work");
    expect(copyText).toContain("Related item 1: Earlier workout logging fix");
    expect(copyText).toContain("Work item ID: work-9");
    expect(copyText).toContain(
      "Why it matched: shared route /routines; shared code area pages/api/workoutEntry"
    );
  });
});
