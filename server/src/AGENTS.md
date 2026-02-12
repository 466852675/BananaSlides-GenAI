# BACKEND

**Scope:** `/server/src` — Express 5 + TypeScript + Prisma + Winston + Zod

---

## OVERVIEW

Layered REST API: Routes → Controllers → Services → Prisma ORM.

## WHERE TO LOOK

| Need | File |
|------|------|
| AI routing | `services/ai.service.ts` |
| Auth | `services/auth.service.ts` |
| Billing | `services/points.service.ts` |
| Rate limits | `middleware/rateLimitMiddleware.ts` |
| Validation | `validators/index.ts` |
| Logger | `utils/logger.ts` |

## CONVENTIONS

**Router Pattern** — `const router = Router(); router.get('/path', handler);`

**Winston Logging** — `log.info('msg', { meta }); log.error('msg', { error });`

**Zod Validation** — `export const Schema = z.object({ name: z.string() });`

**Rate Limiting** — `rateLimit({ windowMs: 60000, max: 30, message: { code: 'RATE_LIMIT_EXCEEDED' }});`

**CORS** — `app.use(cors({ origin: allowedOrigins, credentials: true, allowedHeaders: ['Content-Type', 'Authorization'] }));`

**Prisma Transactions** — `await prisma.$transaction(async (tx) => { await tx.model.create({ data }); });`

## ANTI-PATTERNS

- **Never empty catch blocks** — Always log via Winston
- **Never use `any` type** — Strict TypeScript
- **Always await async** — No fire-and-forget
- **Never Prisma directly in controllers** — Use services
- **Never bypass rate limiters**

## KEY SERVICES

| Service | Purpose |
|---------|---------|
| `ai.service.ts` | Model routing, prompts, image generation |
| `points.service.ts` | Credit/quota system |
| `order.service.ts` | Payment & refunds |
| `project.service.ts` | Project & slide CRUD |
| `setting.service.ts` | Dynamic config, `.env` hot-reload |
| `admin.service.ts` | RBAC, user management |
