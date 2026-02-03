# PROJECT KNOWLEDGE BASE - BananaSlides-GenAI

**Generated:** 2026-02-01  
**Commit:** fb2e0e0 feat: 实现商业化V8.5全链路功能  
**Branch:** main

---

## OVERVIEW

**BananaSlides-GenAI** - AI-powered PPT generation platform with hybrid AI routing. Merges Google Gemini (visual generation), GLM/DeepSeek (logical reasoning), and MinerU (document parsing) into a unified workflow for creating professional presentations from unstructured content.

**Core Stack:** React 19.2 + TypeScript 5.9 + Vite 6.2 + TailwindCSS v4.1 (Frontend) | Node.js 22 + Express 5.2 + Prisma ORM + SQLite (Backend)

---

## STRUCTURE

```
./
├── src/               # React frontend
│   ├── components/    # UI components (admin/, auth/, user/, + root)
│   ├── api/           # HTTP client layer
│   ├── hooks/         # React custom hooks
│   ├── contexts/      # AuthProvider, etc.
│   └── types.ts       # Shared TypeScript definitions
├── server/            # Express backend
│   ├── src/
│   │   ├── services/  # Business logic (16 services)
│   │   ├── routes/    # Express route handlers
│   │   ├── controllers/ # Request handlers
│   │   └── app.ts     # Server entry point
│   ├── prisma/        # Database schema
│   └── uploads/       # File storage
├── docs/              # Technical specs (12 docs in Chinese)
└── tests/             # Playwright E2E tests
```

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| AI model routing | `server/src/services/ai.service.ts` | Hybrid router with adapter pattern |
| Image generation | `server/src/services/ai.service.ts` | 4-level prompt synthesis engine |
| Document parsing | `server/src/routes/mineru.routes.ts` | MinerU integration for PDF/Word |
| Project management | `src/components/Dashboard.tsx` | Main workspace UI (52K lines) |
| Admin panel | `src/components/admin/` | RBAC, orders, points, users |
| API client | `src/api/` | 12 domain-specific clients |
| Auth logic | `src/contexts/AuthContext.tsx` | JWT-based auth |
| Database models | `server/prisma/schema.prisma` | Prisma ORM schema |

---

## CONVENTIONS

### TypeScript
- **Experimental decorators** enabled (legacy Angular-style)
- **Path alias:** `@/` maps to `./src/`
- **No emit:** TypeScript only for type checking, bundler handles compilation
- **Shared types:** Duplicated between `src/types.ts` and `server/src/types.ts` (intentional for type safety)

### React
- **Functional components** with hooks
- **TanStack Query** for server state management
- **Framer Motion** for animations (breathing feedback on AI operations)
- **react-hot-toast** for notifications

### Backend
- **Service layer pattern:** Controllers → Services → Prisma
- **Route registration:** Order matters (auth routes before protected routes)
- **Hot reload:** `.env` changes trigger `SettingService.reloadEnv()`
- **Static serving:** `/uploads` served from `server/uploads/`

### Naming
- Files: PascalCase for components, camelCase for utilities
- Services: `*.service.ts` suffix
- Routes: `*.routes.ts` suffix

---

## ANTI-PATTERNS (THIS PROJECT)

1. **Never bypass service layer** - Always route through `*Service` classes, never call Prisma directly from controllers
2. **Never duplicate types** - Shared types exist in both frontend and backend; keep them in sync manually
3. **Never use any** - Project uses strict TypeScript; avoid `as any` or `@ts-ignore`
4. **Never hardcode AI providers** - Use `SettingService` for dynamic model switching
5. **Never modify .env directly in production** - Use admin settings API for runtime config changes

---

## UNIQUE STYLES

1. **Hybrid AI Router** - Routes tasks by type: Gemini for images, GLM/DeepSeek for logic, MinerU for documents
2. **4-Level Prompt Synthesis** - L1 Visual genes → L2 Business semantics → L3 Instruction fusion → L4 Technical params
3. **Snapshot versioning** - Time-machine rollback for projects via `snapshot.service.ts`
4. **Points-based billing** - Credit system for AI generations, not subscription
5. **Capsule navigation** - UI pattern where header collapses to floating capsule on scroll

---

## COMMANDS

```bash
# Development
npm install && cd server && npm install  # Install deps
npx prisma db push                       # Init database
npm run dev                              # Frontend (port 1000)
npm run dev:server                       # Backend (port 1111)
start_app.bat                           # Windows one-click launch

# Build
npm run build                            # Frontend production build

# Testing
npm run test                             # Playwright E2E tests
```

---

## NOTES

1. **Proxy config:** Vite proxies `/api` and `/uploads` to `localhost:1111`
2. **Database:** SQLite file at `server/prisma/dev.db`
3. **AI routing:** Configurable via `server/.env` or admin panel (hot-reload enabled)
4. **Large files:** Dashboard.tsx (221KB), StyleTemplateManager.tsx (78KB), LandingPageComp.tsx (67KB) - be careful with these
5. **Documentation:** 12 technical specs in `docs/` (Chinese language)
6. **Minifying:** JSZip, jspdf, pptxgenjs pinned versions for stability
