# UI COMPONENTS - YH-AI PPT

**Scope:** `/src/components` — React functional components with Tailwind CSS

---

## OVERVIEW

34 React components implementing PPT generation UI. Organized by domain: admin, auth, user, and root-level workspace components.

## STRUCTURE

```
components/
├── admin/           # RBAC, orders, points, user management (20 files)
├── auth/            # Login modal/page (4 files)
├── user/            # User profile/settings (3 files)
├── sections/        # Landing page sections
└── *.tsx            # Root workspace components (Dashboard, etc.)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Project workspace | `Dashboard.tsx` | Main UI (52K lines) - cards, timelines, exports |
| Admin panel | `admin/*.tsx` | User/Order/Points management |
| Auth flow | `auth/LoginModal.tsx` | JWT-based login modal |
| Landing page | `LandingPageComp.tsx` | Marketing site (67KB) |
| Outline editor | `OutlineGenerator.tsx` | AI outline generation (75KB) |
| Style templates | `StyleTemplateManager.tsx` | Visual theme system (78KB) |
| Result display | `ResultCard.tsx` | Slide preview/variants (31KB) |

## CONVENTIONS

### Component Structure
- **PascalCase** naming (`Dashboard.tsx`, `LoginModal.tsx`)
- Functional components with hooks, no class components
- Props interfaces defined inline or in `types.ts`

### Styling
- **Tailwind CSS v4.1** utility classes
- **Framer Motion** for AI "breathing" feedback animations
- **Lucide React** for icons
- Glassmorphism effects: `backdrop-blur-md bg-white/80`

### State Management
- Local state: `useState`, `useReducer`
- Server state: TanStack Query (React Query) hooks
- Auth context: `AuthContext.tsx` for user session

### Key Patterns
- Modal components accept `isOpen/onClose` props
- Toast notifications via `react-hot-toast`
- Image handling: always use URL strings, never File objects

## ANTI-PATTERNS

- **Never use `variants[0]` directly** — use dedicated preview fields
- **Never store File objects** — always convert to URLs immediately
- **Never use Chinese punctuation** (。！？) in PPT titles/lists
- **Never clear project ID** when inside project context
- **Always use `syncSlidesMutation`** for slide updates, not generic project mutation
