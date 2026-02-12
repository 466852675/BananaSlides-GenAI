# AGENTS.md - YH-AI PPT Development Guide

**Generated:** 2026-02-12
**Stack:** React 19.2 + Vite 6.2 + Express 5.2 + Prisma 6.19 + SQLite

## Quick Commands

### Frontend (Root Directory)
```bash
npm run dev          # Start dev server (localhost:1000)
npm run build        # Production build
npm run preview      # Preview production build
npm test            # Run Playwright E2E tests
```

### Backend (server/ Directory)
```bash
cd server
npm run dev          # Start API server (localhost:1111)
npm run build        # Compile TypeScript
npm start            # Run compiled server
npx prisma db push   # Sync database schema
npx prisma studio    # Open Prisma DB GUI
```

### Testing
```bash
# Run single Playwright test
npx playwright test tests/e2e/sanity.spec.ts

# Run with headed mode (visible browser)
npx playwright test --headed

# Run specific test by name
npx playwright test -g "sanity"
```

## Code Style Guidelines

### TypeScript
- **Backend**: Strict mode enabled (`"strict": true` in server/tsconfig.json)
- **Frontend**: Relaxed mode with `DOM`, `DOM.Iterable`, `ES2022` lib
- **No type suppression**: Never use `as any`, `@ts-ignore`, `@ts-expect-error`
- Use explicit types for function parameters and return values

### React Components
- **Naming**: PascalCase for components (`Dashboard.tsx`, `LoginModal.tsx`)
- **Pattern**: Functional components with hooks only, no class components
- **Props**: Define interfaces inline or in `src/types.ts`
- **Imports**: Organize by category - React → Libraries → Components → Utils/Contexts/APIs

### Styling
- **Framework**: Tailwind CSS v4.1 (utility-first)
- **Animations**: Framer Motion for "breathing" feedback during AI operations
- **Icons**: Lucide React (`import { IconName } from 'lucide-react'`)
- **Effects**: Glassmorphism patterns (`backdrop-blur-md bg-white/80`)

### State Management
- **Local state**: `useState`, `useReducer`
- **Server state**: TanStack Query (`@tanstack/react-query`)
- **Auth**: `AuthContext.tsx` for JWT session management
- **Patterns**:
  - Modal components: Accept `isOpen` and `onClose` props
  - Toast notifications: Use `react-hot-toast`
  - Image handling: Always use URL strings, never File objects

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Dashboard.tsx`, `ResultCard.tsx` |
| Hooks | camelCase + "use" prefix | `useAuth`, `useMessages` |
| Variables | camelCase | `isScrolled`, `billingCycle` |
| Constants | UPPER_SNAKE_CASE | `STYLE_PRESETS`, `COLOR_PRESETS` |
| Interfaces | PascalCase | `ProjectSession`, `StyleConfig` |
| Type Aliases | camelCase | `PageType`, `GlobalStyleMap` |
| File imports | Named imports preferred | `import { UserWidget } from './auth'` |

## Error Handling

- **Backend**: Use `try/catch` with Winston logger, never empty catch blocks
- **Frontend**: Use React Error Boundaries, display toast on failures
- **API errors**: Return structured errors with Zod validation schemas
- **Anti-pattern**: Never suppress errors with empty catch blocks

## API Patterns

### Frontend → Backend
- Proxy via Vite: `/api` → `http://127.0.0.1:1111`
- Auth: JWT via `Authorization: Bearer <token>` header
- File uploads: POST to `/uploads` endpoint

### Backend Routes
- Express 5.x router pattern
- Rate limiting via `express-rate-limit`
- Zod for request validation

## Critical Anti-Patterns

1. **Never** use `variants[0]` directly — use dedicated preview fields
2. **Never** store File objects — always convert to URLs immediately
3. **Never** use Chinese punctuation (。！？) in PPT titles/lists
4. **Never** clear project ID when inside project context
5. **Always** use `syncSlidesMutation` for slide updates, not generic project mutation
6. **Never** commit without running `lsp_diagnostics` on changed files

## Project Structure

```
YH-AI PPT/
├── src/
│   ├── api/              # API client functions
│   ├── components/        # React components (34 files)
│   │   ├── admin/        # RBAC & management (20 files)
│   │   ├── auth/         # Login & auth (4 files)
│   │   └── user/         # Profile & settings (3 files)
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── services/         # Gemini/export services
│   ├── styles/           # CSS files
│   ├── types.ts          # Global type definitions
│   └── utils.ts          # Utility functions
├── server/               # Express backend
│   ├── src/             # Server source
│   ├── prisma/          # Database schema & migrations
│   └── scripts/         # DB & migration scripts
├── tests/e2e/           # Playwright E2E tests
├── docs/                # Specification documents
└── image/               # Assets for README
```

## Key Files Reference

| Component | File | Purpose |
|-----------|------|---------|
| Main Dashboard | `src/components/Dashboard.tsx` | Project workspace UI |
| Outline Editor | `src/components/OutlineGenerator.tsx` | AI outline generation |
| Style Templates | `src/components/StyleTemplateManager.tsx` | Visual theme system |
| Result Display | `src/components/ResultCard.tsx` | Slide preview/variants |
| Auth Context | `src/contexts/AuthContext.tsx` | JWT session management |
| Type Defs | `src/types.ts` | 167 lines of shared interfaces |

## Development Notes

- **Path aliases**: Frontend uses `@/*` → `./src/*` (configured in vite.config.ts)
- **Browser target**: ES2022, supports modern CSS features
- **Database**: SQLite via Prisma ORM (file: `./server/prisma/dev.db`)
- **AI Providers**: Gemini, Volcengine, Zhipu, CustomCombo (router-adapter pattern)

## Backend Entry Points

**Main Server**: `server/src/app.ts` (Express 5, port 1111)
- **Secondary Server**: `server/index.ts` (MinerU proxy)

## Structure Deviations (Non-Standard Patterns)

1. **Tailwind v4 via CDN** - Not build-integrated (`index.html` line 8)
2. **Dual middleware dirs** - Both `middleware/` and `middlewares/` exist
3. **No monorepo workspaces** - Two independent package.json files
4. **Mixed test runners** - Playwright (frontend) + Bun (backend)
5. **Multiple AI agent configs** - .claude, .opencode, .sisyphus at root
