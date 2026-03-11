type Labels = Record<string, string | number>;

interface MetricPoint {
  labels: Labels;
  value: number;
}

function labelKey(labels: Labels): string {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}:${labels[key]}`)
    .join("|");
}

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

class CounterMetric {
  private readonly points = new Map<string, MetricPoint>();

  constructor(
    private readonly name: string,
    private readonly help: string,
  ) {}

  inc(labels: Labels = {}, value = 1): void {
    const key = labelKey(labels);
    const existing = this.points.get(key);

    if (existing) {
      existing.value += value;
      return;
    }

    this.points.set(key, {
      labels,
      value,
    });
  }

  renderLines(): string[] {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const point of this.points.values()) {
      const labelPairs = Object.entries(point.labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}="${escapeLabelValue(String(value))}"`);

      const labelSuffix = labelPairs.length > 0 ? `{${labelPairs.join(",")}}` : "";
      lines.push(`${this.name}${labelSuffix} ${point.value}`);
    }

    return lines;
  }
}

export class MetricsRegistry {
  private readonly httpRequests = new CounterMetric(
    "agent_pr_firewall_http_requests_total",
    "Total HTTP requests handled by route and status code.",
  );

  private readonly webhookEvents = new CounterMetric(
    "agent_pr_firewall_webhook_events_total",
    "Total webhook outcomes by event type and result.",
  );

  private readonly policyDecisions = new CounterMetric(
    "agent_pr_firewall_policy_decisions_total",
    "Total policy decisions by final decision.",
  );

  private readonly policyFindings = new CounterMetric(
    "agent_pr_firewall_policy_findings_total",
    "Total policy findings by policy id and severity.",
  );

  private readonly githubApiCalls = new CounterMetric(
    "agent_pr_firewall_github_api_calls_total",
    "Total GitHub API calls by operation and status.",
  );

  private readonly fileInspectionFailures = new CounterMetric(
    "agent_pr_firewall_file_inspection_failures_total",
    "Total pull request file inspection failures.",
  );

  incrementHttpRequest(method: string, path: string, status: number): void {
    this.httpRequests.inc({ method, path, status });
  }

  incrementWebhookEvent(event: string, result: string): void {
    this.webhookEvents.inc({ event, result });
  }

  incrementPolicyDecision(decision: string): void {
    this.policyDecisions.inc({ decision });
  }

  incrementPolicyFinding(policyId: string, severity: string): void {
    this.policyFindings.inc({ policy_id: policyId, severity });
  }

  incrementGitHubApiCall(operation: string, status: string): void {
    this.githubApiCalls.inc({ operation, status });
  }

  incrementFileInspectionFailure(): void {
    this.fileInspectionFailures.inc();
  }

  renderPrometheus(): string {
    return [
      ...this.httpRequests.renderLines(),
      ...this.webhookEvents.renderLines(),
      ...this.policyDecisions.renderLines(),
      ...this.policyFindings.renderLines(),
      ...this.githubApiCalls.renderLines(),
      ...this.fileInspectionFailures.renderLines(),
      "",
    ].join("\n");
  }
}
