import { z } from 'zod';

const nodeEnvSchema = z
  .enum(['development', 'test', 'production'])
  .default('development');

const portSchema = z.preprocess((value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return undefined;
}, z.number().int().positive().default(3000));

const envSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  PORT: portSchema,

  // Use "*" or a comma-separated list (e.g. "http://localhost:3000,https://app.example.com")
  CORS_ORIGIN: z.string().default('*'),

  // Get it from Supabase Dashboard → Project Settings → Database → Connection string.
  // IMPORTANT: use the "Transaction pooler" string for serverless edge runtimes,
  // but for a long-running Nest backend you can use the direct connection string.
  DATABASE_URL: z.string().min(1),
  // Direct DB connection (used by Prisma Migrate when DATABASE_URL uses PgBouncer)
  DIRECT_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);
  if (parsed.success) return parsed.data;

  const formatted = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment variables:\n${formatted}`);
}
