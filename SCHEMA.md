# EquipFlow Database Schema & SQL Reference Guide

เอกสารระบุรายละเอียด Schema ทั้งหมดของ PostgreSQL บน Supabase รวมถึง Table Constraints, Enums, Foreign Keys, Triggers, และ Indexes

---

## 🗄️ Custom Enum Types

```sql
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
หมวดหมู่อุปกรณ์ (เช่น Laptops, Workstations, Displays, Tablets, Networking)
```sql
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
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
ตารางทะเบียนทรัพย์สินไอที (รองรับอุปกรณ์ 2,000+ รายการ)
```sql
CREATE TABLE public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag TEXT NOT NULL UNIQUE,
    serial_number TEXT,
    name TEXT NOT NULL,
    model TEXT,
    brand TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    status asset_status_enum NOT NULL DEFAULT 'AVAILABLE',
    current_condition condition_status_enum NOT NULL DEFAULT 'EXCELLENT',
    image_url TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    is_borrowable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index สำหรับค้นหาแบบ Instant Search
CREATE INDEX idx_assets_search ON public.assets(asset_tag, name, brand, model);
CREATE INDEX idx_assets_status ON public.assets(status);
```

### 5. `public.borrow_requests`
รายการคำขอยืมอุปกรณ์ และช่วงเวลาการจอง
```sql
CREATE TABLE public.borrow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
    purpose TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status request_status_enum NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index สำหรับ Double-Booking Detection
CREATE INDEX idx_borrow_dates ON public.borrow_requests(asset_id, start_date, end_date, status);
```

### 6. `public.asset_transactions`
บันทึกการส่งมอบและตรวจรับคืน พร้อมภาพถ่ายจาก Supabase Storage และค่าปรับ
```sql
CREATE TABLE public.asset_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrow_request_id UUID NOT NULL REFERENCES public.borrow_requests(id) ON DELETE CASCADE,
    transaction_type transaction_type_enum NOT NULL,
    inspector_id UUID NOT NULL REFERENCES public.profiles(id),
    condition condition_status_enum NOT NULL,
    notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    is_damaged BOOLEAN NOT NULL DEFAULT false,
    damage_fine_amount NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7. `public.audit_logs`
บันทึกประวัติการเปลี่ยนแปลงระบบ (Immutable Audit Trail)
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
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## ⚡ Database Triggers

### Auto Profile Creation Trigger (`handle_new_user`)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role_enum, 'EMPLOYEE'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
