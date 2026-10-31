# Phase 01: Monorepo Foundation & Tooling Setup

## 1. Objective
Establish a clean, modern, and production-grade monorepo foundation using **pnpm workspaces** and **Turborepo**. Configure unified TypeScript, ESLint, and Prettier configurations. Create initial package skeletons for shared common types, database client, and service applications (`apps/api`, `apps/web`, `apps/worker`).

---

## 2. Deliverables Checklist
- [ ] Root `package.json` with Turborepo and pnpm workspace scripts.
- [ ] `pnpm-workspace.yaml` defining `apps/*` and `packages/*`.
- [ ] `turbo.json` defining build pipelines, cache keys, and dependency graphs.
- [ ] Shared configuration packages:
  - `packages/tsconfig`: Shared TypeScript base configurations (`node20`, `nextjs`, `nestjs`).
  - `packages/eslint-config`: Shared ESLint rules across frontend and backend.
- [ ] Shared libraries:
  - `packages/common`: TypeScript DTOs, OpenAI interfaces, enums, error constants, token utilities.
  - `packages/database`: Prisma schema skeleton and database client export.
- [ ] Application skeletons:
  - `apps/api`: NestJS Fastify core gateway entrypoint.
  - `apps/web`: Next.js 14 App Router dashboard entrypoint.
  - `apps/worker`: BullMQ background processor entrypoint.
- [ ] Root `.gitignore` and `.env.example`.

---

## 3. Directory Layout
```
YOYO/
├── .env.example
├── .gitignore
├── pnpm-workspace.yaml
├── package.json
├── turbo.json
├── packages/
│   ├── tsconfig/
│   │   ├── base.json
│   │   ├── nestjs.json
│   │   └── nextjs.json
│   ├── eslint-config/
│   │   └── index.js
│   ├── common/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   └── database/
│       ├── package.json
│       ├── tsconfig.json
│       └── prisma/schema.prisma
└── apps/
    ├── api/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/main.ts
    ├── web/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── app/page.tsx
    └── worker/
        ├── package.json
        ├── tsconfig.json
        └── src/main.ts
```

---

## 4. Acceptance Criteria
1. `pnpm install` executes cleanly with zero dependency conflicts.
2. `pnpm build` triggers Turborepo and builds all packages in topological order without errors.
3. TypeScript compiler checks pass across all workspaces via `pnpm lint` or `pnpm typecheck`.

