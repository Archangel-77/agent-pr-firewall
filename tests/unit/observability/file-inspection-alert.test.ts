import { describe, expect, it } from "vitest";

import { FileInspectionAlertMonitor } from "../../../src/observability/file-inspection-alert.js";

describe("FileInspectionAlertMonitor", () => {
  it("alerts when threshold is reached inside the window", () => {
    const monitor = new FileInspectionAlertMonitor({
      threshold: 3,
      windowMs: 60_000,
    });

    const first = monitor.recordFailure(1_000);
    const second = monitor.recordFailure(2_000);
    const third = monitor.recordFailure(3_000);

    expect(first.shouldAlert).toBe(false);
    expect(second.shouldAlert).toBe(false);
    expect(third.shouldAlert).toBe(true);
    expect(third.recentFailureCount).toBe(3);
  });

  it("suppresses repeated alerts until the window passes", () => {
    const monitor = new FileInspectionAlertMonitor({
      threshold: 2,
      windowMs: 10_000,
    });

    expect(monitor.recordFailure(1_000).shouldAlert).toBe(false);
    expect(monitor.recordFailure(2_000).shouldAlert).toBe(true);
    expect(monitor.recordFailure(3_000).shouldAlert).toBe(false);
    expect(monitor.recordFailure(13_001).shouldAlert).toBe(false);
    expect(monitor.recordFailure(13_002).shouldAlert).toBe(true);
  });
});
