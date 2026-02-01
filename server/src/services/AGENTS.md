# SERVICES - BananaSlides-GenAI

**Scope:** `/server/src/services` — Business logic layer (16 services)

---

## OVERVIEW

Core business logic implementing AI routing, billing, project management, and admin operations. All services use singleton pattern with static methods.

## STRUCTURE

```
services/
├── ai.service.ts           # Hybrid AI router (text/image/vision)
├── admin.service.ts        # RBAC, stats, user management
├── auth.service.ts         # JWT authentication
├── order.service.ts        # Order/billing lifecycle
├── points.service.ts       # Credit system (⚠️ CRITICAL: validate before AI)
├── project.service.ts      # Project CRUD, lifecycle
├── snapshot.service.ts     # Version control, time machine
├── template.service.ts     # Style template management
├── mineru.service.ts       # MinerU document parsing
├── setting.service.ts      # Config hot-reload
├── quota.service.ts        # Usage quotas
├── favorite.service.ts     # User favorites
├── asset.service.ts        # File/asset management
├── growth.service.ts       # Referral/growth
├── lead.service.ts         # Lead capture
└── product.service.ts      # Product catalog
```

## WHERE TO LOOK

| Business Function | Service | Key Methods |
|-------------------|---------|-------------|
| AI Text Generation | `ai.service.ts` | `generateText()`, route by provider |
| AI Image Generation | `ai.service.ts` | `generateImage()`, 4-level prompt engine |
| AI Vision Analysis | `ai.service.ts` | `analyzeImage()`, extract visual genes |
| Document Parsing | `mineru.service.ts` | `parseDocument()`, PDF/Word → structured |
| Auth | `auth.service.ts` | `authenticate()`, `generateToken()` |
| Points Check | `points.service.ts` | `validateSufficient()`, `consume()` |
| Project CRUD | `project.service.ts` | `create()`, `update()`, `delete()` |
| Snapshots | `snapshot.service.ts` | `create()`, `restore()`, `list()` |
| Admin Stats | `admin.service.ts` | `getDashboardStats()`, `getUserStats()` |
| Config Hot-Reload | `setting.service.ts` | `reloadEnv()`, `syncEnvToDatabase()` |

## CONVENTIONS

### Service Pattern
```typescript
export class FeatureService {
  static async methodName(params: Type): Promise<ReturnType> {
    try {
      // Business logic
      const result = await prisma.model.findMany();
      return result;
    } catch (error) {
      throw { code: 'ERROR_CODE', message: '中文错误描述' };
    }
  }
}
```

### AI Routing
- **Text/Logic:** GLM-4.7, DeepSeek
- **Images:** Gemini-3-Pro-Image, Volcengine
- **Vision:** Gemini-3-Flash
- **Documents:** MinerU

### Points Validation (CRITICAL)
```typescript
// ALWAYS validate before AI generation
const hasPoints = await PointsService.validateSufficient(userId, cost);
if (!hasPoints) throw { code: 'INSUFFICIENT_POINTS', ... };
```

## ANTI-PATTERNS

- **Never call Prisma directly** from controllers — always use services
- **Never bypass PointsService** before AI generation — security risk
- **Never hardcode AI providers** — use SettingService for dynamic config
- **Never use any** — strict TypeScript enforcement
- **Never modify .env directly** — use admin API with hot-reload

## NOTES

1. **Hot reload:** SettingService watches `.env` with 500ms debounce
2. **Concurrency:** Image=2, Text=10, Vision=2 (configured in settings)
3. **4-Level Prompt:** L1 Visual → L2 Semantic → L3 Instruction → L4 Technical
4. **Chinese Output:** All error messages must be in Chinese
