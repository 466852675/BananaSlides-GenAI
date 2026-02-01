# init-deep - Generate Hierarchical AGENTS.md Files

## TL;DR

> **Quick Summary**: Generate 5 AGENTS.md files documenting the BananaSlides-GenAI codebase structure, conventions, and patterns for AI assistants.
> 
> **Deliverables**: 
> - `./AGENTS.md` (root overview)
> - `./src/AGENTS.md` (frontend patterns)
> - `./server/AGENTS.md` (backend patterns)
> - `./src/components/AGENTS.md` (component library)
> - `./server/prisma/AGENTS.md` (database layer)
> 
> **Estimated Effort**: Short (5 files, ~500 lines total)
> **Parallel Execution**: YES - 5 independent tasks
> **Critical Path**: None (all independent)

---

## Context

### Original Request
Generate hierarchical AGENTS.md files for the BananaSlides-GenAI codebase to help AI assistants understand the project structure, conventions, and critical patterns.

### Project Analysis Summary
**BananaSlides-GenAI** is an AI-powered PPT generation platform with:
- **Frontend**: React 19.2 + Vite 6.2 + TailwindCSS 4.1 (port 1000)
- **Backend**: Express 5.2 + Prisma + SQLite (port 1111)
- **Stack**: TypeScript (~40k lines), 1094 total files
- **AI Providers**: Gemini, GLM, DeepSeek, Volcengine with hybrid routing
- **Features**: MinerU document parsing, points-based cost system

### Scoring Results
| Directory | Score | Decision | Reason |
|-----------|-------|----------|--------|
| `.` | Root | CREATE | Always create root |
| `src/` | 294 | CREATE | High complexity (88 files, 14 subdirs) |
| `server/` | 390 | CREATE | Highest complexity (111 files, 25 subdirs, pkg + tsconfig) |
| `src/components/` | 191 | CREATE | Component library (61 files, 4 subdirs) |
| `server/prisma/` | 50 | CREATE | Database layer (12 files, 7 subdirs) |
| `server/src/controllers/` | 39 | SKIP | Covered by parent (server/) |
| `server/src/services/` | 48 | SKIP | Covered by parent (server/) |
| `server/src/routes/` | 48 | SKIP | Covered by parent (server/) |
| `src/api/` | 36 | SKIP | Covered by parent (src/) |

---

## Work Objectives

### Core Objective
Generate 5 hierarchical AGENTS.md files that document the project structure, entry points, critical patterns, and anti-patterns specific to BananaSlides-GenAI.

### Concrete Deliverables
- `./AGENTS.md` (root): Project overview, structure, commands, AI config
- `./src/AGENTS.md`: Frontend patterns, React conventions, TanStack Query usage
- `./server/AGENTS.md`: Backend patterns, Express structure, service layer
- `./src/components/AGENTS.md`: Component organization, naming patterns
- `./server/prisma/AGENTS.md`: Database schema, migration patterns

### Definition of Done
- [ ] All 5 AGENTS.md files created with correct content
- [ ] Root file: 100-150 lines, comprehensive overview
- [ ] Subdirectory files: 30-80 lines, focused scope
- [ ] No duplication between parent and child files
- [ ] All critical anti-patterns documented
- [ ] All entry points and key files referenced

### Must Have
- Project-specific anti-patterns ("DO NOT use variants[0]", etc.)
- Entry points (src/index.tsx, server/src/app.ts)
- Path aliases (@/ in frontend)
- Database commands (prisma db push, etc.)
- AI provider configuration details

### Must NOT Have (Guardrails)
- Generic advice that applies to ALL React projects
- Obvious information (like "npm install installs dependencies")
- File content that duplicates parent AGENTS.md
- More than 150 lines per file (root) or 80 lines (subdirs)
- Markdown formatting beyond basic headers and tables

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no test framework for AGENTS.md validation)
- **User wants tests**: Manual verification only
- **QA approach**: Manual verification via file reading

### Automated Verification (File Existence and Content)

**For each AGENTS.md file:**

```bash
# 1. Verify file exists
ls -la ./AGENTS.md ./src/AGENTS.md ./server/AGENTS.md ./src/components/AGENTS.md ./server/prisma/AGENTS.md
# Assert: All 5 files exist

# 2. Verify line counts
wc -l ./AGENTS.md ./src/AGENTS.md ./server/AGENTS.md ./src/components/AGENTS.md ./server/prisma/AGENTS.md
# Assert: Root <= 150 lines, others <= 80 lines

# 3. Verify content presence (grep for required sections)
grep -q "## OVERVIEW" ./AGENTS.md
grep -q "## STRUCTURE\|## WHERE TO LOOK" ./AGENTS.md
grep -q "## ANTI-PATTERNS\|## CONVENTIONS\|## COMMANDS" ./AGENTS.md
# Assert: All required sections present
```

**Evidence to Capture:**
- [ ] Output of `ls -la` showing all 5 files exist
- [ ] Output of `wc -l` showing line counts within limits
- [ ] Output of grep commands showing required sections

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (All Independent - Execute in Parallel):
├── Task 1: Create ./AGENTS.md (root)
├── Task 2: Create ./src/AGENTS.md (frontend)
├── Task 3: Create ./server/AGENTS.md (backend)
├── Task 4: Create ./src/components/AGENTS.md (components)
└── Task 5: Create ./server/prisma/AGENTS.md (database)

Critical Path: None
Parallel Speedup: 5x faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 (Root) | None | None | 2, 3, 4, 5 |
| 2 (src) | None | None | 1, 3, 4, 5 |
| 3 (server) | None | None | 1, 2, 4, 5 |
| 4 (components) | None | None | 1, 2, 3, 5 |
| 5 (prisma) | None | None | 1, 2, 3, 4 |

---

## TODOs

### Task 1: Create Root AGENTS.md

**What to do**:
- Write comprehensive project overview (React 19 + Vite + Express + Prisma)
- Document project structure with tree view
- Create WHERE TO LOOK table mapping tasks to locations
- List ANTI-PATTERNS with specific code comments found
- Include COMMANDS section with all dev/build/test commands
- Add AI PROVIDER CONFIGURATION section

**Must NOT do**:
- Don't include detailed component patterns (save for src/components/)
- Don't include detailed service patterns (save for server/)
- Don't exceed 150 lines

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: None needed (pure documentation task)

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
- **Blocks**: None
- **Blocked By**: None

**References**:
- `package.json` - Frontend dependencies and scripts
- `server/package.json` - Backend dependencies and scripts
- `tsconfig.json` - Path alias @/ configuration
- `README.md` - Project overview and features

**Acceptance Criteria**:
- [ ] File created at `./AGENTS.md`
- [ ] Contains OVERVIEW section with project description
- [ ] Contains STRUCTURE or WHERE TO LOOK section
- [ ] Contains ANTI-PATTERNS section with "DO NOT" comments found
- [ ] Contains COMMANDS section with npm scripts
- [ ] Contains AI PROVIDER CONFIGURATION section
- [ ] Line count: 100-150 lines
- [ ] Written in telegraphic style (no fluff)

**Commit**: YES
- Message: `docs: add root AGENTS.md with project overview`
- Files: `AGENTS.md`

---

### Task 2: Create src/AGENTS.md (Frontend)

**What to do**:
- Document frontend-specific patterns and conventions
- Entry points: `src/index.tsx`, `src/App.tsx`
- Path alias `@/` usage
- TanStack Query patterns in `src/api/`
- React 19 + TypeScript 5.8 patterns
- TailwindCSS usage (loaded via CDN in index.html)

**Must NOT do**:
- Don't repeat project overview from root
- Don't include backend patterns
- Don't exceed 80 lines

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: None
- **Blocked By**: None

**References**:
- `src/index.tsx` - React entry point
- `src/App.tsx` - Main component (1300+ lines)
- `src/api/` - API client patterns
- `vite.config.ts` - Vite proxy configuration

**Acceptance Criteria**:
- [ ] File created at `./src/AGENTS.md`
- [ ] Contains OVERVIEW (1-2 lines)
- [ ] Contains STRUCTURE section (if >5 subdirs)
- [ ] Contains WHERE TO LOOK table
- [ ] Contains CONVENTIONS section (frontend-specific)
- [ ] Line count: 30-80 lines

**Commit**: YES
- Message: `docs: add src/AGENTS.md for frontend patterns`
- Files: `src/AGENTS.md`

---

### Task 3: Create server/AGENTS.md (Backend)

**What to do**:
- Document backend-specific patterns
- Entry point: `server/src/app.ts`
- Express 5.2 structure
- Controllers/Routes/Services organization
- Prisma ORM usage patterns
- Points system and rules.json
- No path aliases (use relative imports)

**Must NOT do**:
- Don't repeat project overview from root
- Don't include frontend patterns
- Don't exceed 80 lines

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: None
- **Blocked By**: None

**References**:
- `server/src/app.ts` - Express entry point
- `server/src/controllers/` - Route handlers
- `server/src/services/` - Business logic
- `server/src/routes/` - API route definitions
- `server/prisma/schema.prisma` - Database schema
- `server/rules.json` - Points/cost system

**Acceptance Criteria**:
- [ ] File created at `./server/AGENTS.md`
- [ ] Contains OVERVIEW (1-2 lines)
- [ ] Contains STRUCTURE section (if >5 subdirs)
- [ ] Contains WHERE TO LOOK table
- [ ] Contains CONVENTIONS section (backend-specific)
- [ ] Line count: 30-80 lines

**Commit**: YES
- Message: `docs: add server/AGENTS.md for backend patterns`
- Files: `server/AGENTS.md`

---

### Task 4: Create src/components/AGENTS.md

**What to do**:
- Document component organization and naming patterns
- Subdirectories: admin, auth, modals, user
- Component naming conventions
- Props/State patterns
- Reusable vs page-specific components

**Must NOT do**:
- Don't list every component (too verbose)
- Don't include API patterns (in parent)
- Don't exceed 80 lines

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: None
- **Blocked By**: None

**References**:
- `src/components/` - Component files
- `src/components/admin/` - Admin components
- `src/components/auth/` - Auth components

**Acceptance Criteria**:
- [ ] File created at `./src/components/AGENTS.md`
- [ ] Contains OVERVIEW (1 line)
- [ ] Contains STRUCTURE section with subdirs
- [ ] Contains CONVENTIONS section (naming, props)
- [ ] Line count: 30-80 lines

**Commit**: YES
- Message: `docs: add src/components/AGENTS.md for component patterns`
- Files: `src/components/AGENTS.md`

---

### Task 5: Create server/prisma/AGENTS.md

**What to do**:
- Document database layer patterns
- schema.prisma structure
- Migration commands
- Seed data (seed.ts)
- Database backups in prisma/ directory
- SQLite-specific patterns

**Must NOT do**:
- Don't include full schema (too verbose)
- Don't include service patterns (in parent)
- Don't exceed 80 lines

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: None
- **Blocked By**: None

**References**:
- `server/prisma/schema.prisma` - Database schema
- `server/prisma/seed.ts` - Seed data
- `server/dev.db` - SQLite database file

**Acceptance Criteria**:
- [ ] File created at `./server/prisma/AGENTS.md`
- [ ] Contains OVERVIEW (1 line)
- [ ] Contains STRUCTURE section
- [ ] Contains COMMANDS section (db push, seed, studio)
- [ ] Line count: 30-80 lines

**Commit**: YES
- Message: `docs: add server/prisma/AGENTS.md for database patterns`
- Files: `server/prisma/AGENTS.md`

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 1 | `docs: add root AGENTS.md with project overview` | `AGENTS.md` |
| 2 | `docs: add src/AGENTS.md for frontend patterns` | `src/AGENTS.md` |
| 3 | `docs: add server/AGENTS.md for backend patterns` | `server/AGENTS.md` |
| 4 | `docs: add src/components/AGENTS.md for component patterns` | `src/components/AGENTS.md` |
| 5 | `docs: add server/prisma/AGENTS.md for database patterns` | `server/prisma/AGENTS.md` |

---

## Success Criteria

### Verification Commands
```bash
# Verify all files exist
ls -la ./AGENTS.md ./src/AGENTS.md ./server/AGENTS.md ./src/components/AGENTS.md ./server/prisma/AGENTS.md

# Verify line counts
wc -l ./AGENTS.md ./src/AGENTS.md ./server/AGENTS.md ./src/components/AGENTS.md ./server/prisma/AGENTS.md

# Verify required sections
grep -l "## OVERVIEW" ./AGENTS.md ./src/AGENTS.md ./server/AGENTS.md ./src/components/AGENTS.md ./server/prisma/AGENTS.md | wc -l
# Expected: 5
```

### Final Checklist
- [ ] All 5 AGENTS.md files created
- [ ] Root file: 100-150 lines
- [ ] Subdirectory files: 30-80 lines each
- [ ] No content duplication between parent and child
- [ ] All entry points documented
- [ ] All anti-patterns documented
- [ ] All commands documented
- [ ] Telegraphic style (no fluff)
