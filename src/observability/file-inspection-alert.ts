export interface FileInspectionAlertConfig {
  threshold: number;
  windowMs: number;
}

export interface FileInspectionAlertResult {
  shouldAlert: boolean;
  recentFailureCount: number;
}

export class FileInspectionAlertMonitor {
  private readonly failureTimestamps: number[] = [];
  private lastAlertAt: number | null = null;

  constructor(private readonly config: FileInspectionAlertConfig) {}

  recordFailure(now = Date.now()): FileInspectionAlertResult {
    const windowStart = now - this.config.windowMs;
    this.failureTimestamps.push(now);

    while (this.failureTimestamps.length > 0) {
      const first = this.failureTimestamps[0];
      if (first === undefined || first >= windowStart) {
        break;
      }

      this.failureTimestamps.shift();
    }

    const recentFailureCount = this.failureTimestamps.length;
    const thresholdReached = recentFailureCount >= this.config.threshold;
    const notAlertedRecently =
      this.lastAlertAt === null || now - this.lastAlertAt >= this.config.windowMs;

    if (thresholdReached && notAlertedRecently) {
      this.lastAlertAt = now;
      return {
        shouldAlert: true,
        recentFailureCount,
      };
    }

    return {
      shouldAlert: false,
      recentFailureCount,
    };
  }
}
