# EquipFlow API Routing & Endpoint Architecture Specification

เอกสารระบุข้อมูลเส้นทาง Routing, HTTP Methods, Middleware Guards, Data Contracts, และ Status Codes ทั้งหมดของระบบ EquipFlow

---

## 🌐 Base URL & Conventions
- **Production URL:** `https://api.equipflow.local/api/v1`
- **Local Dev Gateway:** `http://localhost:8081/api/v1`
- **Frontend Reverse Proxy (Optional):** `/backend-api/*`
- **Content-Type:** `application/json`
- **Authorization Header:** `Bearer <Supabase_JWT_Token>`
- **Dev Role Bypass Header:** `X-Dev-Role: <EMPLOYEE | IT_ADMIN | SUPER_ADMIN>`

---

## 🛡️ Route Middleware Summary

| Middleware | หน้าที่ (Responsibility) | พฤติกรรมเมื่อไม่ผ่าน (On Failure) |
| :--- | :--- | :--- |
| `AuthMiddleware` | ตรวจสอบความถูกต้องของ Supabase JWT หรือ Dev Role | `401 Unauthorized` |
| `RequireAdmin` | จำกัดสิทธิ์เฉพาะ `IT_ADMIN` และ `SUPER_ADMIN` | `403 Forbidden` |
| `RequireSuperAdmin` | จำกัดสิทธิ์เฉพาะ `SUPER_ADMIN` สูงสุดเท่านั้น | `403 Forbidden` |

---

## 📋 Comprehensive Routes Reference

### 1. System Health & Diagnostics
#### `GET /health`
- **Access:** Public
- **Description:** ตรวจสอบความพร้อมใช้งานของ Backend API และสถานะการเชื่อมต่อ Database Pool
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "app": "EquipFlow Backend API",
    "database": "connected"
  }
  ```

---

### 2. Authentication & Current Profile
#### `GET /api/v1/auth/me`
- **Access:** Authenticated (Any Role)
- **Description:** ดึงข้อมูล Profile ของผู้ใช้งานที่กำลัง Login อยู่
- **Response `200 OK`:**
  ```json
  {
    "data": {
      "id": "11111111-1111-1111-1111-111111111111",
      "email": "admin@equipflow.local",
      "full_name": "Super Administrator",
      "role": "SUPER_ADMIN",
      "is_active": true,
      "created_at": "2026-08-31T09:00:00Z"
    }
  }
  ```

---

### 3. Equipment Asset Catalog
#### `GET /api/v1/assets`
- **Access:** Authenticated (Any Role)
- **Query Parameters:**
  - `search`: string (ค้นหาตาม Tag, Name, Brand, Model)
  - `category_id`: uuid
  - `status`: string (`AVAILABLE`, `BORROWED`, `MAINTENANCE`)
  - `page`: integer (default: 1)
  - `limit`: integer (default: 30)
- **Response `200 OK`:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "asset_tag": "IT-2026-00001",
        "name": "MacBook Pro 14 M3",
        "brand": "Apple",
        "model": "M3 Pro",
        "status": "AVAILABLE",
        "current_condition": "EXCELLENT",
        "is_borrowable": true,
        "location": { "id": "uuid", "name": "IT Storeroom Building A" },
        "category": { "id": "uuid", "name": "Laptops & Notebooks" }
      }
    ],
    "meta": { "total": 2001, "page": 1, "limit": 30 }
  }
  ```

#### `GET /api/v1/assets/:id`
- **Access:** Authenticated (Any Role)
- **Response `200 OK`:** ข้อมูลรายละเอียดอุปกรณ์รายชิ้นพร้อมประวัติยืม

#### `GET /api/v1/assets/scan/:tag`
- **Access:** Authenticated (Any Role)
- **Description:** สแกนค้นหาอุปกรณ์ด้วยรหัส Barcode/QR Code Tag (เช่น `IT-2026-00042`)

#### `POST /api/v1/assets`
- **Access:** IT_ADMIN & SUPER_ADMIN
- **Payload:**
  ```json
  {
    "asset_tag": "IT-2026-APPLE-09",
    "name": "MacBook Air 15 M3",
    "brand": "Apple",
    "model": "MacBookAir15,2",
    "category_id": "uuid",
    "location_id": "uuid",
    "serial_number": "C02XYZ12345",
    "is_borrowable": true,
    "current_condition": "EXCELLENT"
  }
  ```
- **Response `201 Created`**

#### `PUT /api/v1/assets/:id`
- **Access:** IT_ADMIN & SUPER_ADMIN
- **Description:** อัปเดตข้อมูลอุปกรณ์

#### `DELETE /api/v1/assets/:id`
- **Access:** SUPER_ADMIN Only
- **Response `200 OK`:** `{"message": "Asset deleted successfully"}`

---

### 4. Borrow Requests & Inspection Workflow
#### `GET /api/v1/borrow-requests`
- **Access:** Authenticated (พนักงานดูของตนเอง, Admin ดูทั้งหมด)
- **Query Parameters:** `status`, `page`, `limit`

#### `POST /api/v1/borrow-requests`
- **Access:** Authenticated (Any Role)
- **Payload:**
  ```json
  {
    "asset_id": "uuid",
    "purpose": "นำไปใช้งานนอกสถานที่ งานสัมมนาประจำปี",
    "start_date": "2026-09-02T09:00:00Z",
    "end_date": "2026-09-05T18:00:00Z"
  }
  ```
- **Validation:** ตรวจสอบช่วงเวลาไม่ให้เกิดการจองทับซ้อน (Double Booking)
- **Response `201 Created`**

#### `POST /api/v1/borrow-requests/:id/review`
- **Access:** IT_ADMIN & SUPER_ADMIN
- **Payload:** `{"status": "APPROVED"}` หรือ `{"status": "REJECTED", "rejection_reason": "เหตุผล"}`

#### `POST /api/v1/borrow-requests/:id/handover`
- **Access:** IT_ADMIN & SUPER_ADMIN
- **Payload (บันทึกส่งมอบพร้อมหลักฐาน):**
  ```json
  {
    "condition": "EXCELLENT",
    "notes": "ส่งมอบพร้อมสายชาร์จแท้และกระเป๋า",
    "photos": ["https://...supabase.co/.../handover-01.jpg"]
  }
  ```

#### `POST /api/v1/borrow-requests/:id/return`
- **Access:** IT_ADMIN & SUPER_ADMIN
- **Payload (ตรวจสภาพรับคืนและคิดค่าปรับ):**
  ```json
  {
    "condition": "FAIR",
    "notes": "จอภาพมีรอยขีดข่วนเล็กน้อย",
    "photos": ["https://...supabase.co/.../return-01.jpg"],
    "is_damaged": true,
    "damage_fine_amount": 500
  }
  ```

---

### 5. Analytics & Dashboard
#### `GET /api/v1/analytics/dashboard`
- **Access:** Authenticated
- **Description:** สรุปตัวเลขสถิติภาพรวมผู้บริหาร (Total, Available, Borrowed, Maintenance, Utilization Rate, Category Breakdown)

#### `GET /api/v1/analytics/my-stats`
- **Access:** Authenticated
- **Description:** สรุปสถิติการยืมของพนักงานที่ล็อกอินอยู่

---

### 6. Super Admin User Management & RBAC
#### `GET /api/v1/users`
- **Access:** IT_ADMIN & SUPER_ADMIN
- **Description:** เรียกดูรายชื่อผู้ใช้งานทั้งหมดในระบบ

#### `POST /api/v1/users/:id/grant-role`
- **Access:** SUPER_ADMIN Only
- **Payload:** `{"role": "IT_ADMIN"}` (รองรับ `EMPLOYEE`, `IT_ADMIN`, `SUPER_ADMIN`)
- **Audit:** บันทึกประวัติ `GRANT_PERMISSION` ลง `public.audit_logs`

#### `POST /api/v1/users/:id/status`
- **Access:** SUPER_ADMIN Only
- **Payload:** `{"is_active": false}` (Suspend หรือ Activate บัญชี)
- **Audit:** บันทึกประวัติ `TOGGLE_USER_STATUS`
