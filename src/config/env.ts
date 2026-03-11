import { z } from "zod";

const logLevels = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(logLevels).default("info"),
  GITHUB_API_BASE_URL: z.string().url().default("https://api.github.com"),
  GITHUB_APP_ID: z.coerce.number().int().positive(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  GITHUB_PRIVATE_KEY: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema>;

function formatIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;
}

export function loadEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${formatIssues(parsed.error.issues)}`);
  }

  return {
    ...parsed.data,
    GITHUB_PRIVATE_KEY: normalizePrivateKey(parsed.data.GITHUB_PRIVATE_KEY),
  };
}
