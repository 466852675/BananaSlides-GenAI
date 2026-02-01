# API CLIENTS - BananaSlides-GenAI

**Scope:** `/src/api` — HTTP client layer for backend communication

---

## OVERVIEW

12 domain-specific API clients using axios. All follow consistent pattern: base setup, typed requests, unified error handling.

## STRUCTURE

```
api/
├── client.ts        # Axios instance with interceptors
├── auth.ts          # Login/logout/register
├── admin.ts         # Admin operations (users, orders, stats)
├── projects.ts      # Project CRUD + snapshots
├── templates.ts     # Style templates
├── history.ts       # Archived projects
├── favorites.ts     # User favorites
├── settings.ts      # App configuration
├── orders.ts        # Billing orders
├── points.ts        # Credit system
├── product.ts       # Products/pricing
└── growth.ts        # Growth/referral
```

## WHERE TO LOOK

| Operation | File | Key Functions |
|-----------|------|---------------|
| Auth | `auth.ts` | `login()`, `register()`, `logout()` |
| Projects | `projects.ts` | `getProjects()`, `createProject()`, `updateProject()` |
| AI Generation | `projects.ts` | `generateSlide()`, `generateOutline()` |
| Snapshots | `projects.ts` | `createSnapshot()`, `restoreSnapshot()` |
| Templates | `templates.ts` | `getTemplates()`, `saveTemplate()` |
| Admin Users | `admin.ts` | `getUsers()`, `updateUser()` |
| Admin Orders | `admin.ts` | `getOrders()`, `updateOrderStatus()` |
| Points | `points.ts` | `getBalance()`, `consumePoints()` |

## CONVENTIONS

### Client Pattern
```typescript
import { apiClient } from './client';

export const featureApi = {
  async methodName(params: Type): Promise<ReturnType> {
    const response = await apiClient.post('/endpoint', params);
    return response.data;
  }
};
```

### Error Handling
- Automatic retry with exponential backoff (configured in client.ts)
- TanStack Query integration: `useMutation` + `useQuery` for server state
- Always refetch after error or success

### Types
- Request/response types defined in `src/types.ts` and `server/src/types.ts`
- Keep in sync manually between frontend and backend

## ANTI-PATTERNS

- **Never use `variants[0]` directly** — use dedicated preview fields
- **Never use settings.ts for UI display** — use `useAppSettingsMasked()` instead
- **Always refetch after mutations** — maintains cache consistency
- **Never bypass apiClient** — use configured instance for all requests

## NOTES

1. **Proxy:** Vite dev server proxies `/api` to `localhost:1111`
2. **Auth:** JWT stored in memory (via AuthContext), added to headers by interceptor
3. **Uploads:** Large files use multipart/form-data via upload routes
