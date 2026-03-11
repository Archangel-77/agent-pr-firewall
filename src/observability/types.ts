import type { FileInspectionAlertMonitor } from "./file-inspection-alert.js";
import type { MetricsRegistry } from "./metrics.js";

export interface AppObservability {
  metrics: MetricsRegistry;
  fileInspectionAlertMonitor: FileInspectionAlertMonitor;
}
