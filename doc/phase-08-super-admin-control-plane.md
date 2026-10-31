# Phase 08: Super Admin Control Plane

## 1. Objective
Build the dedicated administrative portal allowing platform operators to monitor GPU infrastructure in real time, manage model deployments and downloads, configure tenant quotas, and audit system-wide activity.

---

## 2. Deliverables Checklist
- [ ] Admin Navigation & Access Guard:
  - Restricted to users with `role: 'SUPER_ADMIN'`.
  - Accessible via `/admin` within the web application.
- [ ] Infrastructure & Worker Monitor:
  - Real-time tile view of all worker nodes (`ONLINE`, `OFFLINE`, `BUSY`).
  - GPU telemetry: Device name, VRAM allocation (used vs total), GPU temperature, active worker threads.
- [ ] Model Deployment Center:
  - Browse available models from the Ollama library.
  - Trigger one-click model downloads to selected workers.
  - Live progress bar tracking layer downloads via SSE or WebSocket.
  - Force-unload models to instantly reclaim VRAM.
- [ ] Tenant & User Management:
  - Paginated list of registered users.
  - Edit monthly token allowances and request rate limits.
  - Account actions: Suspend, Reactivate, Delete.
- [ ] System Audit & Log Stream:
  - Chronological audit ledger recording sensitive events (model deletion, quota adjustments, auth lockouts).

---

## 3. Worker Telemetry API
- `GET /api/admin/workers`:
```json
[
  {
    "id": "w1",
    "worker_name": "worker-gpu-01",
    "endpoint_url": "http://ollama-worker-gpu0:11434",
    "status": "ONLINE",
    "gpu_model_name": "NVIDIA GeForce RTX 4090",
    "total_vram_bytes": 25769803776,
    "used_vram_bytes": 18454937600,
    "loaded_models": ["llama3.3:8b", "qwen2.5-coder:7b"]
  }
]
```

---

## 4. Acceptance Criteria
1. Non-admin users are redirected away or served 403 Forbidden on `/admin/*`.
2. Admin can initiate a model download and watch the progress bar increment without page refresh.
3. Modifying a user's quota takes effect on their subsequent inference requests immediately.

