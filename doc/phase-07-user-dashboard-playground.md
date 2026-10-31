# Phase 07: User Dashboard & Interactive Playground

## 1. Objective
Build the customer-facing web application in `apps/web` using **Next.js 14 (App Router)**, **Tailwind CSS**, and **Shadcn UI**. Deliver an intuitive developer experience including account management, interactive model playground, API key portal, and usage analytics.

---

## 2. Deliverables Checklist
- [ ] Application Shell & Theme:
  - Dark/Light mode support.
  - Sidebar navigation, top header with user avatar, and notifications indicator.
- [ ] Authentication Screens:
  - Sign in, Sign up, Forgot password, and Email verification views.
- [ ] Model Explorer:
  - Searchable and filterable grid of all deployed models.
  - Parameter badge tags: Context window, quantization (`Q4_K_M`), parameter size, license.
  - One-click copy for model identifier (e.g., `llama3.3:8b`).
- [ ] Interactive Playground:
  - Multi-turn conversational chat interface.
  - Settings Drawer: Model selector, Temperature, Top-P, Max Tokens, System Message.
  - Real-time token streaming with live generation speed (tokens/sec) and TTFT display.
  - Code Snippet Exporter: Generates executable cURL, Python (`openai`), and Node.js code snippets.
- [ ] API Key Management:
  - Key listing table with masked formats and last-used dates.
  - Modal to create keys with optional model restrictions and expiration dates.
  - Secure one-time secret view dialog with copy button.
- [ ] Usage & Analytics:
  - Interactive charts (Recharts) displaying daily requests and token consumption.

---

## 3. UI Component Structure
```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx (Overview)
│   │   ├── models/page.tsx (Model Explorer)
│   │   ├── playground/page.tsx (Interactive Playground)
│   │   ├── keys/page.tsx (API Keys)
│   │   ├── analytics/page.tsx (Usage)
│   │   └── settings/page.tsx (Profile)
└── components/
    ├── ui/ (Shadcn primitives: button, dialog, slider, etc.)
    ├── playground/ (ChatBox, ParameterDrawer, CodeExportModal)
    └── analytics/ (UsageCharts, MetricCards)
```

---

## 4. Acceptance Criteria
1. Responsive on mobile, tablet, and desktop viewports.
2. Playground streams responses in real time directly from the YOYO API.
3. Users can generate an API key and immediately use it in the playground or cURL.
4. Analytics charts accurately reflect requests made during testing.

