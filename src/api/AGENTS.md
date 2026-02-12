# src/api/

HTTP client layer for backend communication.

---

## OVERVIEW

15 domain-specific API modules using axios with unified interceptors for auth and error handling.

## WHERE TO LOOK

| File | Purpose |
|------|---------|
| `client.ts` | Axios instance with JWT interceptors |
| `auth.ts` | Login/logout/register/reset password |
| `projects.ts` | Project CRUD + TanStack Query hooks |
| `admin.ts` | Admin operations (users, orders, stats) |
| `templates.ts` | Style template CRUD |
| `points.ts` | Credit system operations |
| `orders.ts` | Billing and payment |

## API PATTERNS

### Axios Client Setup
```typescript
export const client = axios.create({
    baseURL: '/api',  // Vite proxy to localhost:1111
    timeout: 600000,
});
```

### JWT Token Interceptor
```typescript
client.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

### TanStack Query Hooks
```typescript
export const useProjects = () => useQuery({
    queryKey: ['projects'],
    queryFn: () => client.get('/projects'),
});

export const useCreateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => client.post('/projects', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    });
};
```

### Error Handling
- 401: Auto-clear token + dispatch `auth:logout` event
- 403: Return "权限不足" message
- 502/504: Return gateway/proxy error with helpful context

## ANTI-PATTERNS

- **Never hardcode URLs** — Always use `/api` baseURL via Vite proxy
- **Never store tokens outside localStorage** — Use `TOKEN_KEY` constant only
- **Never ignore API errors** — All errors must be caught and handled (toast/console)
- **Never call client directly in components** — Always use TanStack Query hooks
- **Never forget to invalidate queries** — Call `invalidateQueries` after mutations
