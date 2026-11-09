import { z } from "zod";

export const envSchema  = z.object({
    NODE_ENV :z.enum(["development","production","test"]).default("development"),
    GATEWAY_PORT : z.coerce.number().default(7171),
    WORKSPACE_DIR:z.string().min(1).default("~/.7a/workspace"),
    LLM_PROVIDER:z.enum(["mock","gemini","ollama"]).default("mock"),
    MONTHLY_BUDGET_INR:z.coerce.number().nullable().default(null),
    DRY_RUN:z.coerce.boolean().default(false)
})

export type Env = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env);
