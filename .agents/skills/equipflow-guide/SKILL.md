---
name: equipflow-guide
description: >-
  Enterprise IT Asset Management runbook & operating manual for EquipFlow.
  Use this skill whenever developing, maintaining, debugging, extending, or operating
  the EquipFlow backend (Go Fiber Clean Architecture), frontend (Next.js App Router),
  or database (Supabase PostgreSQL, Auth & Storage).
---

# EquipFlow Enterprise IT Asset Management Skill

Skill นี้เป็นคู่มือมาตรฐาน (Standard Operating Procedure & Architectural Runbook) สำหรับระบบ **EquipFlow**

---

## 🧭 System Architecture & Rules

### 1. Backend (Go Clean Architecture)
- **Layer Separation:**
  1. `domain/`: Business entities (GORM struct tags, JSON tags), Value Objects, Domain Interfaces. ห้าม import package ภายนอกนอกจาก standard library หรือ UUID
  2. `repository/postgres/`: ดำเนินการเกี่ยวกับฐานข้อมูล SQL เท่านั้น
  3. `usecase/`: Business Logic & Audit Trail Logging
  4. `delivery/http/`: Fiber Handler รับ Request, Parse Body, Validate, เรียก Usecase, และ Format JSON Response
- **Do NOT Kill Ports Rule:**
  - ผู้ใช้งานเป็นคนสั่งรันและเปิด Terminal เอง ห้ามรันคำสั่งที่ kill process พอร์ต 8081 หรือ 3000

### 2. Frontend (Next.js 16 App Router)
- **Theme Palette:** Clean White & Emerald Green
  - Background: `bg-slate-50`
  - Cards: `bg-white` + `border-slate-200/80` + `shadow-xs`
  - Primary Accent: `bg-emerald-600` / `text-emerald-600` / `border-emerald-200`
- **State & Data Fetching:** TanStack React Query (`queryClient.invalidateQueries`)
- **QR Code Format:** `EQUIPFLOW:ASSET:<UUID>`

---

## 🛠️ Workflows & Procedures

### Workflow A: Adding a New Entity to Backend
1. กำหนด Struct Entity และ Interface ใน `internal/domain/<entity>.go`
2. สร้าง Repository ใน `internal/repository/postgres/<entity>_repo.go`
3. สร้าง Usecase ใน `internal/usecase/<entity>_usecase.go` พร้อมเรียก `auditRepo.Create` บันทึก Audit Log
4. สร้าง Handler ใน `internal/delivery/http/handler/<entity>_handler.go`
5. ผูก Route ใน `internal/delivery/http/router.go` และลงทะเบียนใน `cmd/api/main.go`
6. ตรวจสอบการคอมไพล์: `go build -o bin/api.exe ./cmd/api`

### Workflow B: Handling Borrow Request & Double Booking
- ตรวจสอบช่วงเวลาว่าอุปกรณ์ชิ้นนั้นมีคำขอที่สถานะ `APPROVED` หรือ `BORROWED` ในช่วงเวลาทับซ้อนหรือไม่:
  ```sql
  WHERE asset_id = ? 
    AND status IN ('APPROVED', 'BORROWED') 
    AND (start_date < ? AND end_date > ?)
  ```

### Workflow C: Super Admin Role Granting
- Endpoint: `POST /api/v1/users/:id/grant-role`
- Guard: `middleware.RequireSuperAdmin()`
- ตรวจสอบ `profiles.role` และบันทึกลง `audit_logs`
