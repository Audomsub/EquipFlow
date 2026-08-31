# EquipFlow Backend API (Go Clean Architecture)

ระบบ Backend API สำหรับ **EquipFlow Enterprise IT Asset Management** พัฒนาด้วยภาษา **Go (Golang)** และ **Fiber Framework** ตามแนวคิด **Clean Architecture** (Domain -> Usecase -> Repository -> Delivery)

---

## 🏛️ สถาปัตยกรรมภายใน (Internal Architecture)

```
backend/
├── cmd/api/main.go               # Main application entry point & DI Wiring
├── internal/
│   ├── config/config.go          # Config loader (.env)
│   ├── domain/                   # Business entities & Core contracts
│   │   ├── asset.go              # Asset, Category, Location models & interfaces
│   │   ├── borrow_request.go     # BorrowRequest, Transaction models & interfaces
│   │   ├── user.go               # Profile, UserRole, User contracts
│   │   ├── analytics.go          # Dashboard KPIs & aggregated metrics
│   │   └── audit_log.go          # Enterprise Audit Trail contracts
│   ├── repository/postgres/      # Database implementation (GORM + PostgreSQL)
│   │   ├── db.go                 # Connection pool configuration
│   │   ├── asset_repo.go         # Asset & Category queries
│   │   ├── borrow_repo.go        # Borrow requests & transaction handlers
│   │   ├── user_repo.go          # User profiles & role update handlers
│   │   ├── analytics_repo.go     # Aggregation SQL queries
│   │   └── audit_repo.go         # Audit logging queries
│   ├── usecase/                  # Application business rules
│   │   ├── asset_usecase.go      # Asset validation & double-booking prevention
│   │   ├── borrow_usecase.go     # Borrow workflow, inspection & fine calculations
│   │   ├── user_usecase.go       # RBAC role granting & status toggling
│   │   └── analytics_usecase.go  # Analytics data collation
│   └── delivery/http/            # Fiber HTTP delivery layer
│       ├── router.go             # Route registration & grouping
│       ├── handler/              # HTTP Request handlers
│       │   ├── asset_handler.go
│       │   ├── borrow_handler.go
│       │   ├── user_handler.go
│       │   ├── analytics_handler.go
│       │   └── audit_handler.go
│       └── middleware/           # Middlewares (Auth JWT, RBAC Guard, Logger, CORS)
│           ├── auth_middleware.go
│           └── rbac_middleware.go
```

---

## 📡 สรุปรายการ RESTful APIs (API Endpoints)

### 1. Authentication & Profile
- `GET  /health` - ตรวจสอบสถานะการเชื่อมต่อ Database และ Server
- `GET  /api/v1/auth/me` - ตรวจสอบโปรไฟล์ของผู้ใช้งานปัจจุบัน (JWT หรือ X-Dev-Role)

### 2. IT Assets Management
- `GET    /api/v1/assets` - ดึงรายการอุปกรณ์ทั้งหมด (รองรับ Search, Filter, Pagination)
- `GET    /api/v1/assets/:id` - ดึงข้อมูลอุปกรณ์รายชิ้นพร้อมประวัติ
- `GET    /api/v1/assets/scan/:tag` - สแกนอุปกรณ์ด้วย Asset Tag หรือ QR Code
- `POST   /api/v1/assets` - ลงทะเบียนอุปกรณ์ใหม่ *(IT Admin & Super Admin)*
- `PUT    /api/v1/assets/:id` - แก้ไขข้อมูลอุปกรณ์ *(IT Admin & Super Admin)*
- `DELETE /api/v1/assets/:id` - ลบอุปกรณ์ออกจากระบบ *(เฉพาะ Super Admin)*

### 3. Borrow Requests & Inspection Workflow
- `POST /api/v1/borrow-requests` - ยื่นคำขอยืมอุปกรณ์ (พร้อมตรวจสอบ Double-Booking)
- `GET  /api/v1/borrow-requests` - ดึงรายการคำขอยืม (ตามสิทธิ์ผู้ใช้หรือทั้งหมด)
- `GET  /api/v1/borrow-requests/:id` - ดูรายละเอียดคำขอ
- `POST /api/v1/borrow-requests/:id/review` - อนุมัติ (`APPROVED`) หรือปฏิเสธ (`REJECTED`) *(Admin)*
- `POST /api/v1/borrow-requests/:id/handover` - บันทึกส่งมอบเครื่องพร้อมภาพถ่ายสภาพอุปกรณ์ *(Admin)*
- `POST /api/v1/borrow-requests/:id/return` - ตรวจรับคืนเครื่อง ประเมินสภาพ และคิดค่าปรับความเสียหาย *(Admin)*

### 4. Executive Analytics & Audit Trail
- `GET /api/v1/analytics/dashboard` - สรุปสถิติผู้บริหาร (KPIs, Categories Breakdown, Recent Activities)
- `GET /api/v1/analytics/my-stats` - สรุปสถิติส่วนบุคคลสำหรับพนักงาน
- `GET /api/v1/audit-logs` - เรียกดูบันทึก Audit Trail ของระบบ *(Admin)*

### 5. Super Admin User Management & RBAC
- `GET  /api/v1/users` - เรียกดูรายชื่อผู้ใช้ทั้งหมดในระบบ *(Admin)*
- `POST /api/v1/users/:id/grant-role` - มอบหมาย/เปลี่ยนสิทธิ์ Role (`EMPLOYEE`, `IT_ADMIN`, `SUPER_ADMIN`) *(เฉพาะ Super Admin)*
- `POST /api/v1/users/:id/status` - เปิดใช้งานหรือระงับบัญชีผู้ใช้ *(เฉพาะ Super Admin)*

---

## 🛠️ วิธีการรัน Backend

1. ตั้งค่าไฟล์ `.env` ในโฟลเดอร์ `backend`:
```env
PORT=8081
ENV=development
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.aqvlduohmgnxlwocmsde
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=postgres
DB_SSLMODE=require
SUPABASE_URL=https://aqvlduohmgnxlwocmsde.supabase.co
```

2. รันด้วย Go:
```bash
go run cmd/api/main.go
```
หรือรันผ่านไฟล์ Binary ที่บิวด์ไว้แล้ว:
```bash
.\bin\api.exe
```
