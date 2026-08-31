# EquipFlow Frontend (Next.js 16 App Router)

เว็บแอปพลิเคชันสำหรับระบบ **EquipFlow Enterprise IT Asset Management** พัฒนาด้วย **Next.js 16 (App Router)**, **TypeScript**, และ **TailwindCSS v4** ภายใต้ธีมดีไซน์ **Clean White & Emerald Green (ขาว-เขียว สบายตา สไตล์ Modern Enterprise SaaS)**

---

## 🎨 การออกแบบและการตกแต่ง (Design Aesthetics)

- **Color Palette:**
  - **Background:** `bg-slate-50` (สะอาด สบายตา)
  - **Surface & Cards:** `bg-white` พร้อมเงาละมุน `shadow-xs` และขอบคมชัด `border-slate-200/80`
  - **Primary Accent:** `Emerald Green` (`#059669` / `bg-emerald-600`) มอบความรู้สึกปลอดภัย สดชื่น ระดับพรีเมียม
  - **Typography:** ฟอนต์ Inter คมชัด อ่านง่าย มี Hierarchy ที่เป็นระเบียบ
- **Design Principles:**
  - Dynamic Feedback: แสดงสถานะคำขอ (Approved, Borrowed, Returned, Rejected) ด้วยสีมาตรฐานที่เข้าใจง่าย
  - Interactive Modals: ออกแบบหน้าต่างป๊อปอัปสำหรับพิมพ์ป้าย QR Code, ตรวจรับสภาพเครื่อง, และหน้าต่างเข้าสู่ระบบอย่างประณีต

---

## 📂 โครงสร้างส่วนหน้า (Frontend Structure)

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router Structure
│   │   ├── layout.tsx            # Global Layout, Providers & Font config
│   │   ├── globals.css           # TailwindCSS configuration & base styles
│   │   ├── page.tsx              # Main Dashboard, Catalog, Dispatch & User Mgmt Hub
│   │   ├── login/page.tsx        # Dedicated Login Page with Role-Based Redirection
│   │   └── register/page.tsx     # Dedicated Registration Page
│   ├── components/               # Reusable Modular Components
│   │   ├── auth-modal.tsx        # Sign In & Sign Up modal
│   │   ├── qr-code-modal.tsx     # Printable asset tag QR label generator
│   │   ├── inspection-modal.tsx  # Photo upload & damage assessment modal
│   │   └── providers.tsx         # QueryClient & Context providers
│   ├── context/
│   │   └── auth-context.tsx      # Global Authentication, Supabase session & Role Switcher
│   ├── lib/
│   │   ├── api.ts                # Axios instance with BaseURL and interceptors
│   │   └── supabase.ts           # Supabase JS SDK client
│   └── types/
│       └── index.ts              # Domain interfaces & TypeScript definitions
├── next.config.ts                # Next.js config (allowedDevOrigins & headers)
└── package.json
```

---

## 🧩 ความสามารถของหน้าจอและคอมโพเนนต์ (Key Pages & Components)

### 1. หน้า Login (`/login`) & Register (`/register`)
- รองรับการล็อกอินผ่าน Supabase Auth
- ตรวจสอบ Role อัตโนมัติ:
  - **SUPER_ADMIN** ➔ นำทางไปยังศูนย์จัดการสิทธิ์ผู้ใช้ (`/?tab=users`)
  - **IT_ADMIN** ➔ นำทางไปยังศูนย์ส่งมอบและตรวจรับคืน (`/?tab=admin`)
  - **EMPLOYEE** ➔ นำทางไปยังแคตตาล็อกอุปกรณ์พร้อมยืม (`/?tab=assets`)
- มีปุ่ม Quick Demo คลิกเดียวสำหรับทดสอบสิทธิ์ต่างๆ

### 2. ศูนย์จัดการผู้ใช้งาน & กำหนดสิทธิ์ (`/?tab=users`)
- เฉพาะผู้ใช้ที่มีสิทธิ์ **SUPER_ADMIN** เท่านั้น
- ตารางแสดงผู้ใช้ในระบบทั้งหมด
- Dropdown มอบสิทธิ์ (Grant Role): เลื่อนขั้นหรือปรับลดสิทธิ์ของผู้ใช้เป็น `EMPLOYEE`, `IT_ADMIN`, หรือ `SUPER_ADMIN`
- ปุ่มระงับสิทธิ์ / เปิดใช้งานบัญชี (Suspend / Active)

### 3. แคตตาล็อกอุปกรณ์ & พิมพ์ป้ายสติกเกอร์ QR Code (`/?tab=assets`)
- แสดงรายการอุปกรณ์พร้อมภาพและสถานะ
- ปุ่มรูป QR Code เปิด Modal ป้ายสติกเกอร์สำหรับพิมพ์ติดเครื่องคอมพิวเตอร์
- ฟอร์มยื่นคำขอยืมอุปกรณ์พร้อมเลือกวัน-เวลาเริ่มต้นและสิ้นสุด

### 4. ศูนย์ตรวจสภาพและส่งมอบเครื่อง (`/?tab=admin`)
- ตารางรายการคำขอสำหรับเจ้าหน้าที่ IT Admin
- อนุมัติ / ปฏิเสธคำขอ
- ปุ่ม **ตรวจสภาพ & ส่งมอบ (Handover)**: ถ่ายรูปสภาพเครื่องก่อนส่งมอบอัปโหลดขึ้น Supabase Storage
- ปุ่ม **ตรวจรับคืนอุปกรณ์ (Return)**: บันทึกสภาพรับคืน พร้อมระบบคิดค่าปรับความเสียหาย

---

## 🚀 วิธีการรัน Frontend

```bash
# ติดตั้ง dependencies
npm install

# รันในโหมด Development
npm run dev

# ทดสอบบิวด์ Production Bundle
npm run build
```
เปิดใช้งานที่: `http://localhost:3000`
