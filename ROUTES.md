# EquipFlow API Endpoints & Route Reference Guide

เอกสารระบุรายละเอียด RESTful API ทั้งหมดของระบบ EquipFlow (Go Fiber Clean Architecture) พร้อม Middleware Guards, Request Payloads, และ Expected Responses

---

## 🛡️ Authentication & Authorization Headers

ทุก Endpoint (ยกเว้น `/health` และหน้า Auth) ต้องแนบ JWT Token:
```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

---

## 📡 API Endpoint Index

| Method | Endpoint | Description | Access Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | ตรวจสอบสถานะ Server และ Database Connection | Public |
| `GET` | `/api/v1/auth/me` | ดึงข้อมูล Profile ผู้ใช้งานที่กำลัง Authenticated | Authenticated |
| **Categories & Locations** | | | |
| `GET` | `/api/v1/categories` | ดึงรายการหมวดหมู่ทั้งหมดและ Dynamic Form Schemas | Authenticated |
| `GET` | `/api/v1/categories/:id` | ดึงข้อมูลหมวดหมู่รายชิ้น | Authenticated |
| `POST` | `/api/v1/categories` | สร้างหมวดหมู่ใหม่และกำหนดฟิลด์ Dynamic | `IT_ADMIN`, `SUPER_ADMIN` |
| `PUT` | `/api/v1/categories/:id` | แก้ไขหมวดหมู่และสคีมาแบบฟอร์ม/Checklist | `IT_ADMIN`, `SUPER_ADMIN` |
| `DELETE`| `/api/v1/categories/:id` | ลบหมวดหมู่อุปกรณ์ | `SUPER_ADMIN` |
| `GET` | `/api/v1/locations` | ดึงรายการสถานที่จัดเก็บทั้งหมด | Authenticated |
| `POST` | `/api/v1/locations` | สร้างสถานที่จัดเก็บใหม่ | `IT_ADMIN`, `SUPER_ADMIN` |
| **Notifications** | | | |
| `GET` | `/api/v1/notifications` | ดึงรายการแจ้งเตือนของผู้ใช้งานที่ Login | Authenticated |
| `POST` | `/api/v1/notifications/:id/read` | ทำเครื่องหมายว่าอ่านแล้วรายชิ้น | Authenticated |
| `POST` | `/api/v1/notifications/read-all` | ทำเครื่องหมายว่าอ่านแล้วทั้งหมด | Authenticated |
| **Asset Management** | | | |
| `GET` | `/api/v1/assets` | ดึงรายการทรัพย์สินทั้งหมด (รองรับ Filter & Pagination) | Authenticated |
| `GET` | `/api/v1/assets/:id` | ดึงข้อมูลอุปกรณ์ตาม UUID | Authenticated |
| `GET` | `/api/v1/assets/scan/:tag` | ค้นหาอุปกรณ์ด้วย Asset Tag หรือ QR Code Payload | Authenticated |
| `POST` | `/api/v1/assets` | ลงทะเบียนทรัพย์สินใหม่ | `IT_ADMIN`, `SUPER_ADMIN` |
| `PUT` | `/api/v1/assets/:id` | อัปเดตข้อมูลทรัพย์สิน | `IT_ADMIN`, `SUPER_ADMIN` |
| `DELETE`| `/api/v1/assets/:id` | ลบทรัพย์สินออกจากระบบ | `SUPER_ADMIN` |
| **Borrowing & Reservation** | | | |
| `POST` | `/api/v1/borrow-requests` | ยื่นคำขอยืมอุปกรณ์ (พร้อม Dynamic `request_data`) | Authenticated |
| `GET` | `/api/v1/borrow-requests` | ดึงรายการคำขอยืม (ตามสิทธิ์ผู้ใช้งาน) | Authenticated |
| `GET` | `/api/v1/borrow-requests/:id` | ดึงรายละเอียดคำขอยืมและผลการตรวจสภาพ | Authenticated |
| `POST` | `/api/v1/borrow-requests/:id/review`| อนุมัติหรือปฏิเสธคำขอ (`APPROVED`/`REJECTED`) | `IT_ADMIN`, `SUPER_ADMIN` |
| `POST` | `/api/v1/borrow-requests/:id/handover`| สแกนส่งมอบอุปกรณ์ บันทึกภาพถ่ายและ Checklist | `IT_ADMIN`, `SUPER_ADMIN` |
| `POST` | `/api/v1/borrow-requests/:id/return`| ตรวจรับคืนอุปกรณ์ บันทึกสภาพ และคำนวณค่าปรับ | `IT_ADMIN`, `SUPER_ADMIN` |
| **Analytics & KPIs** | | | |
| `GET` | `/api/v1/analytics/dashboard`| สรุปตัวเลข KPI ภาพรวมระดับผู้บริหาร | Authenticated |
| `GET` | `/api/v1/analytics/my-stats` | สรุปสถิติการยืมของพนักงานที่เข้าสู่ระบบ | Authenticated |
| **Audit Trail** | | | |
| `GET` | `/api/v1/audit-logs` | ดึงประวัติกิจกรรมการแก้ไขในระบบ | `IT_ADMIN`, `SUPER_ADMIN` |
| **User & RBAC Management** | | | |
| `GET` | `/api/v1/users` | ดึงรายชื่อผู้ใช้งานทั้งหมด | `IT_ADMIN`, `SUPER_ADMIN` |
| `POST` | `/api/v1/users/:id/grant-role`| เลื่อนขั้น/ปรับลดสิทธิ์ผู้ใช้ (`EMPLOYEE`, `IT_ADMIN`, `SUPER_ADMIN`) | `SUPER_ADMIN` |
| `POST` | `/api/v1/users/:id/status` | เปิดใช้งานหรือระงับสิทธิ์บัญชีผู้ใช้ | `SUPER_ADMIN` |
