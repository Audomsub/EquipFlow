# EquipFlow Database Schema & SQL Reference Guide

เอกสารระบุรายละเอียด Schema ทั้งหมดของ PostgreSQL บน Supabase รวมถึง Table Constraints, Enums, Foreign Keys, Triggers, Indexes, และ Dynamic Schema Engine (JSONB)

---

## 🗄️ Custom Enum Types & Extensions

```sql
-- เปิดใช้งาน Extension สำหรับ Date Range Overlap Exclusion Constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- บทบาทผู้ใช้งาน
CREATE TYPE user_role_enum AS ENUM ('EMPLOYEE', 'IT_ADMIN', 'SUPER_ADMIN');

-- สถานะของอุปกรณ์
CREATE TYPE asset_status_enum AS ENUM ('AVAILABLE', 'RESERVED', 'BORROWED', 'MAINTENANCE', 'LOST', 'DISPOSED');

-- สภาพของอุปกรณ์
CREATE TYPE condition_status_enum AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'BROKEN');

-- สถานะของคำขอยืม
CREATE TYPE request_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BORROWED', 'RETURNED', 'OVERDUE', 'CANCELLED');

-- ประเภทธุรกรรมการส่งมอบ/รับคืน
CREATE TYPE transaction_type_enum AS ENUM ('HANDOVER', 'RETURN', 'MAINTENANCE_IN', 'MAINTENANCE_OUT');
```

---

## 📋 Table Definitions

### 1. `public.profiles`
ตารางจัดเก็บข้อมูลโปรไฟล์และบทบาทสิทธิ์ของผู้ใช้งาน (เชื่อมโยงกับ `auth.users`)
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    employee_code TEXT UNIQUE,
    department TEXT,
    phone_number TEXT,
    role user_role_enum NOT NULL DEFAULT 'EMPLOYEE',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. `public.categories`
หมวดหมู่อุปกรณ์ รองรับ Dynamic Schema สำหรับแบบฟอร์มขอยืม (`required_form_fields`) และรายการตรวจสภาพ (`checklist_template`)
```sql
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT DEFAULT 'box',
    required_form_fields JSONB DEFAULT '[]'::jsonb,
    checklist_template JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. `public.locations`
สถานที่จัดเก็บอุปกรณ์ (อาคาร, ชั้น, ห้องคลังสินค้า)
```sql
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    building TEXT,
    room TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. `public.assets`
คลังทะเบียนทรัพย์สินและอุปกรณ์ IT ขององค์กร
```sql
CREATE TABLE public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag TEXT NOT NULL UNIQUE,
    serial_number TEXT UNIQUE,
    name TEXT NOT NULL,
    model TEXT,
    brand TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    status asset_status_enum NOT NULL DEFAULT 'AVAILABLE',
    current_condition condition_status_enum NOT NULL DEFAULT 'GOOD',
    image_url TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    is_borrowable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5. `public.borrow_requests`
รายการคำขอยืมและจองอุปกรณ์ พร้อมเก็บข้อมูลเฉพาะหมวดหมู่ (`request_data`)
```sql
CREATE TABLE public.borrow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    request_data JSONB DEFAULT '{}'::jsonb,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status request_status_enum NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (end_date > start_date)
);
```

### 6. `public.borrow_transactions`
บันทึกการส่งมอบ (Handover) และรับคืน (Return) ตรวจสภาพอุปกรณ์ ถ่ายภาพ และประเมินค่าปรับ
```sql
CREATE TABLE public.borrow_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL UNIQUE REFERENCES public.borrow_requests(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    handed_over_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    handover_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    handover_condition condition_status_enum NOT NULL,
    handover_notes TEXT,
    handover_photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    handover_checklist_results JSONB DEFAULT '[]'::jsonb,

    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ,
    return_condition condition_status_enum,
    return_notes TEXT,
    return_photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    return_checklist_results JSONB DEFAULT '[]'::jsonb,
    is_damaged BOOLEAN NOT NULL DEFAULT false,
    damage_fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7. `public.notifications`
การแจ้งเตือน Realtime In-app สำหรับผู้ใช้งานเมื่อสถานะคำขอเปลี่ยนแปลง
```sql
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 8. `public.audit_logs`
บันทึกประวัติการกระทำสำคัญทั้งหมดในระบบ (Enterprise Audit Trail)
```sql
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## ⚡ Database Triggers

### 1. Auto-create Profile on Supabase User Signup
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role_enum, 'EMPLOYEE'::user_role_enum)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
