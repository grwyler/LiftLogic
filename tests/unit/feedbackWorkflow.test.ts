import { describe, expect, it } from "vitest";
import {
  FEEDBACK_TRIAGE_STATUSES,
  buildWorkItemUrl,
  createFeedbackFingerprint,
  formatFingerprintLabel,
  getLegacyStatusFromTriage,
  getWorkItemAnchorId,
  isHighSignalFeedback,
  shouldAutoQueueFixJob,
} from "../../utils/feedbackWorkflow";
import { FeedbackItemDoc } from "../../utils/types";

const buildBugFeedback = (
  overrides: Partial<FeedbackItemDoc> = {}
): Partial<FeedbackItemDoc> => ({
  type: "bug",
  title: "Workout log failed",
  description:
    "Recorded repro session\nCurrent page: /routines\nStarted: 2026-03-14T12:00:00.000Z\nCompleted: 2026-03-14T12:01:00.000Z\n\nSteps to reproduce\n1. Tap log set\n2. Wait for sync\n\nCaptured errors\n1. [window-error] Failed to save workout entry",
  page: "/routines",
  ...overrides,
});

describe("feedback workflow fingerprinting", () => {
  it("keeps fingerprints stable when only dynamic metadata changes", () => {
    const first = buildBugFeedback({
      runtimeContext: {
        appVersion: "1.0.0",
        commitSha: "abc123",
        environment: "preview",
      },
      description: [
        "Recorded repro session",
        "Current page: /routines",
        "Started: 2026-03-14T12:00:00.000Z",
        "Completed: 2026-03-14T12:01:00.000Z",
        "",
        "Steps to reproduce",
        "1. Tap log set",
        "2. Wait for sync",
        "",
        "Captured errors",
        "1. [window-error] Failed to save workout entry",
      ].join("\n"),
    });

    const second = buildBugFeedback({
      runtimeContext: {
        appVersion: "1.0.1",
        commitSha: "def456",
        environment: "production",
        route: "/routines?tab=today",
        userAgent: "Mozilla/5.0",
      },
      description: [
        "Recorded repro session",
        "Current page: /routines",
        "Started: 2026-03-14T18:41:00.000Z",
        "Completed: 2026-03-14T18:42:00.000Z",
        "Viewport: 390x844",
        "User agent: Mozilla/5.0",
        "Online: yes",
        "",
        "Steps to reproduce",
        "1. Tap log set",
        "2. Wait for sync",
        "",
        "Captured errors",
        "1. [window-error] Failed to save workout entry",
      ].join("\n"),
    });

    expect(createFeedbackFingerprint(first)).toBe(
      createFeedbackFingerprint(second)
    );
  });

  it("dedupes similar bug reports using the first captured error signal", () => {
    const first = buildBugFeedback({
      title: "Unhandled client error",
      description: [
        "Recorded repro session",
        "Current page: /routines",
        "Started: 2026-03-14T12:00:00.000Z",
        "Completed: 2026-03-14T12:01:00.000Z",
        "",
        "Steps to reproduce",
        "1. Tap log set",
        "2. Wait for sync",
        "",
        "Captured errors",
        "1. [window-error] Cannot read properties of undefined",
      ].join("\n"),
      bugReport: {
        mode: "recorded",
        errors: [
          {
            timestamp: "2026-03-14T12:00:00.000Z",
            source: "window-error",
            page: "/routines",
            message: "Cannot read properties of undefined",
          },
        ],
      },
    });

    const second = buildBugFeedback({
      title: "Unhandled client error",
      description: [
        "Recorded repro session",
        "Current page: /routines",
        "Started: 2026-03-14T18:00:00.000Z",
        "Completed: 2026-03-14T18:01:00.000Z",
        "Viewport: 390x844",
        "User agent: Mozilla/5.0",
        "Online: yes",
        "",
        "Steps to reproduce",
        "1. Tap log set",
        "2. Wait for sync",
        "",
        "Captured errors",
        "1. [window-error] Cannot read properties of undefined",
      ].join("\n"),
      bugReport: {
        mode: "recorded",
        errors: [
          {
            timestamp: "2026-03-14T18:00:00.000Z",
            source: "window-error",
            page: "/routines",
            message: "Cannot read properties of undefined",
          },
        ],
      },
    });

    expect(createFeedbackFingerprint(first)).toBe(
      createFeedbackFingerprint(second)
    );
  });

  it("does not dedupe when the primary bug signal changes", () => {
    const first = buildBugFeedback({
      title: "Unhandled client error",
      bugReport: {
        mode: "recorded",
        errors: [
          {
            timestamp: "2026-03-14T12:00:00.000Z",
            source: "window-error",
            page: "/routines",
            message: "Cannot read properties of undefined",
          },
        ],
      },
    });

    const second = buildBugFeedback({
      title: "Unhandled client error",
      bugReport: {
        mode: "recorded",
        errors: [
          {
            timestamp: "2026-03-14T12:05:00.000Z",
            source: "window-error",
            page: "/routines",
            message: "saveWorkoutEntry 500: Internal Server Error",
          },
        ],
      },
    });

    expect(createFeedbackFingerprint(first)).not.toBe(
      createFeedbackFingerprint(second)
    );
  });

  it("does not dedupe when type or page changes", () => {
    const bugFingerprint = createFeedbackFingerprint(
      buildBugFeedback({
        title: "Workout log failed",
        page: "/routines",
      })
    );
    const featureFingerprint = createFeedbackFingerprint(
      buildBugFeedback({
        type: "feature",
        title: "Workout log failed",
        page: "/routines",
      })
    );
    const otherPageFingerprint = createFeedbackFingerprint(
      buildBugFeedback({
        title: "Workout log failed",
        page: "/feedback",
      })
    );

    expect(featureFingerprint).not.toBe(bugFingerprint);
    expect(otherPageFingerprint).not.toBe(bugFingerprint);
  });
});

describe("feedback workflow signal classification", () => {
  it("treats high-severity bugs as high signal", () => {
    expect(
      isHighSignalFeedback(buildBugFeedback({ severity: "high" }))
    ).toBe(true);
  });

  it("treats recorded bug reports and captured errors as high signal", () => {
    expect(
      isHighSignalFeedback(
        buildBugFeedback({
          bugReport: {
            mode: "recorded",
          },
        })
      )
    ).toBe(true);

    expect(
      isHighSignalFeedback(
        buildBugFeedback({
          bugReport: {
            mode: "recorded",
            errors: [
              {
                timestamp: "2026-03-14T12:00:00.000Z",
                source: "console-error",
                page: "/routines",
                message: "Recurring rule request failed",
              },
            ],
          },
        })
      )
    ).toBe(true);
  });

  it("treats disliked coach feedback and repeated bug occurrences as high signal", () => {
    expect(
      isHighSignalFeedback(
        buildBugFeedback({
          coachFeedback: {
            sentiment: "dislike",
          },
        })
      )
    ).toBe(true);

    expect(isHighSignalFeedback(buildBugFeedback(), 2)).toBe(true);
  });

  it("does not classify low-signal one-off feature feedback as high signal", () => {
    expect(
      isHighSignalFeedback({
        type: "feature",
        title: "Make the dashboard cleaner",
        description: "Please simplify the layout.",
      })
    ).toBe(false);

    expect(
      isHighSignalFeedback(
        buildBugFeedback({
          severity: "low",
          coachFeedback: {
            sentiment: "like",
          },
        }),
        1
      )
    ).toBe(false);
  });
});

describe("feedback workflow auto-queue gating", () => {
  it("queues new high-signal work without an existing fix thread", () => {
    expect(
      shouldAutoQueueFixJob({
        feedback: buildBugFeedback({ severity: "high" }),
        occurrenceCount: 1,
        triageStatus: "new",
        hasFixThreadId: false,
      })
    ).toBe(true);
  });

  it("allows duplicate triage items to auto-queue if still high signal", () => {
    expect(
      shouldAutoQueueFixJob({
        feedback: buildBugFeedback(),
        occurrenceCount: 2,
        triageStatus: "duplicate",
        hasFixThreadId: false,
      })
    ).toBe(true);
  });

  it("blocks auto-queue when a fix thread exists or triage already progressed", () => {
    expect(
      shouldAutoQueueFixJob({
        feedback: buildBugFeedback({ severity: "high" }),
        occurrenceCount: 1,
        triageStatus: "new",
        hasFixThreadId: true,
      })
    ).toBe(false);

    expect(
      shouldAutoQueueFixJob({
        feedback: buildBugFeedback({ severity: "high" }),
        occurrenceCount: 1,
        triageStatus: "fixing",
        hasFixThreadId: false,
      })
    ).toBe(false);
  });

  it("does not auto-queue low-signal reports", () => {
    expect(
      shouldAutoQueueFixJob({
        feedback: buildBugFeedback({ severity: "low" }),
        occurrenceCount: 1,
        triageStatus: "new",
        hasFixThreadId: false,
      })
    ).toBe(false);
  });
});

describe("feedback workflow formatting helpers", () => {
  it("maps triage status to legacy status", () => {
    expect(getLegacyStatusFromTriage("new")).toBe("new");
    expect(getLegacyStatusFromTriage("details copied")).toBe("planned");
    expect(getLegacyStatusFromTriage("queued")).toBe("planned");
    expect(getLegacyStatusFromTriage("fixing")).toBe("reviewing");
    expect(getLegacyStatusFromTriage("resolved")).toBe("resolved");
    expect(getLegacyStatusFromTriage("duplicate")).toBe("closed");
    expect(getLegacyStatusFromTriage("verified")).toBe("closed");
  });

  it("builds stable work item anchors, urls, and fingerprint labels", () => {
    expect(getWorkItemAnchorId("abc123")).toBe("work-item-abc123");
    expect(
      buildWorkItemUrl({
        appUrl: "https://lift-logic.app/",
        workItemId: "abc123",
      })
    ).toBe("https://lift-logic.app/bugs#work-item-abc123");
    expect(formatFingerprintLabel("wrk_1234567890abcdef_more")).toBe(
      "wrk_1234567890abcd"
    );
    expect(formatFingerprintLabel()).toBe("unknown");
  });

  it("includes the copied-details handoff status in the supported workflow states", () => {
    expect(FEEDBACK_TRIAGE_STATUSES).toContain("details copied");
  });
});
