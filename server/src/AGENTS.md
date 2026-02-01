# BACKEND - BananaSlides-GenAI

**Scope:** `/server/src` — Express 5 + TypeScript + Prisma ORM

---

## OVERVIEW

REST API backend with layered architecture: Controllers → Services → Prisma. Hot-reload enabled for `.env` changes.

## STRUCTURE

```
server/src/
├── app.ts              # Entry point (136 lines) - route registration
├── services/           # Business logic (16 files) - Service classes
├── routes/             # Express routes (16 files) - HTTP handlers
├── controllers/        # Request handlers (13 files)
├── middleware/         # Auth, validation, error handling
├── validators/         # Zod/request validation schemas
├── prisma/             # Database schema (SQLite)
└── types.ts            # Backend type definitions
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| AI routing | `services/ai.service.ts` | Hybrid router (Gemini/GLM/DeepSeek) |
| Auth | `services/auth.service.ts` | JWT generation/validation |
| Billing | `services/points.service.ts` | Credit system |
| Projects | `services/project.service.ts` | CRUD + lifecycle |
| Snapshots | `services/snapshot.service.ts` | Version control/time machine |
| Orders | `services/order.service.ts` | Transaction management |
| Admin | `services/admin.service.ts` | RBAC, stats, user mgmt |
| Document parsing | `routes/mineru.routes.ts` | MinerU PDF/Word integration |

## CONVENTIONS

### Service Layer Pattern
```typescript
export class FeatureService {
  static async methodName(params): Promise<Type> {
    // Business logic
    // Prisma calls
  }
}
```

### Route Registration (ORDER MATTERS)
```typescript
// app.ts - auth routes MUST come first
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes); // Protected
```

### Error Handling
- Services throw with `{ code, message }` objects
- Controllers catch and return `res.status().json()`
- Auth middleware: `{ code: 'FORBIDDEN', message: '权限不足' }`

### Database
- Prisma ORM with SQLite file storage
- Schema: `server/prisma/schema.prisma`
- Commands: `npx prisma db push` (dev), `npx prisma migrate dev` (prod)

## ANTI-PATTERNS

- **Never bypass service layer** — Always route through `*Service` classes
- **Never call Prisma directly** from controllers — use services
- **Never use any** — Strict TypeScript, avoid `as any` or `@ts-ignore`
- **Never hardcode AI providers** — Use `SettingService` for dynamic switching
- **Never modify .env in production** — Use admin settings API (hot-reload enabled)

## NOTES

1. **Hot reload:** `.env` changes trigger `SettingService.reloadEnv()` with 500ms debounce
2. **Port conflict:** If `EADDRINUSE`, run `taskkill /F /IM node.exe`
3. **Route shadowing:** Snapshots route registered before projects to avoid conflicts
4. **Bootstrap:** Admin seeding runs on server start via `bootstrap/admin.bootstrap.ts`
