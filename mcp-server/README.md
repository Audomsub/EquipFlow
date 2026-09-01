# 🤖 EquipFlow Model Context Protocol (MCP) Server

**EquipFlow MCP Server** คือส่วนขยายมาตรฐาน [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) ที่ช่วยให้ระบบปัญญาประดิษฐ์ (AI Assistants เช่น **Antigravity**, **Claude Desktop**, **Cursor**) สามารถเชื่อมต่อกับระบบบริหารจัดการทรัพย์สินองค์กร **EquipFlow** ได้โดยตรง

พนักงานสามารถสนทนากับ AI เป็นภาษาธรรมชาติเพื่อค้นหาอุปกรณ์, ตรวจสอบความพร้อมใช้งาน, และให้ AI นำทางกรอกข้อมูลเฉพาะหมวดหมู่เพื่อยื่นคำขอยืมอุปกรณ์เข้าระบบได้แบบอัตโนมัติ

---

## 🛠️ รายการ Tools ที่ให้บริการแก่ AI (MCP Tools Catalog)

| Tool Name | คำอธิบาย | ข้อมูลที่ต้องการ (Parameters) |
| :--- | :--- | :--- |
| `list_categories` | ดึงรายชื่อ 6 หมวดหมู่อุปกรณ์หลัก พร้อมฝ่ายผู้ดูแล (Custodian) | *(ไม่มี)* |
| `get_category_requirements` | ดึงฟิลด์ข้อมูลบังคับที่ต้องถามพนักงาน และ Checklist ตรวจสภาพของหมวดหมู่นั้น | `category_name_or_id` |
| `search_available_assets` | ค้นหาอุปกรณ์ว่างตามคำค้นหา (เช่น รถตู้, Sony FX3, Aeron, สว่าน) | `query`, `category_id`, `status` |
| `check_asset_availability` | ตรวจสอบว่าอุปกรณ์ว่างหรือไม่ในช่วงวัน-เวลาที่ระบุ (ป้องกันการจองชนกัน) | `asset_id`, `start_date`, `end_date` |
| `submit_borrow_request` | ยื่นคำขอยืมอุปกรณ์พร้อมบันทึก `request_data` เฉพาะหมวดหมู่เข้าระบบ | `user_email`, `asset_id`, `purpose`, `start_date`, `end_date`, `request_data` |
| `get_my_borrow_requests` | ตรวจสอบสถานะคำขอยืมของพนักงานรายบุคคล | `user_email` |
| `admin_review_request` | อนุมัติหรือปฏิเสธคำขอ (สำหรับ Admin / Custodian) | `reviewer_email`, `request_number_or_id`, `action`, `rejection_reason` |

---

## ⚙️ การตั้งค่าเชื่อมต่อกับ AI Clients

### 1. การเชื่อมต่อกับ Antigravity IDE
ไฟล์คอนฟิกถูกลงทะเบียนไว้ที่ `C:\Users\User\.gemini\config\mcp_config.json`:
```json
{
  "mcpServers": {
    "equipflow-mcp-server": {
      "command": "node",
      "args": [
        "c:/Users/User/Desktop/EquipFlow/mcp-server/dist/index.js"
      ],
      "env": {
        "SUPABASE_URL": "https://aqvlduohmgnxlwocmsde.supabase.co"
      }
    }
  }
}
```

### 2. การเชื่อมต่อกับ Claude Desktop
เพิ่มลงใน `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "equipflow": {
      "command": "node",
      "args": [
        "c:/Users/User/Desktop/EquipFlow/mcp-server/dist/index.js"
      ]
    }
  }
}
```

---

## 💬 ตัวอย่างบทสนทนาการใช้งาน (Conversational AI Workflow)

### ตัวอย่างที่ 1: ขอยืมยานพาหนะส่วนกลาง (Fleet & Vehicles)
> 👤 **พนักงาน**: *"อยากขอยืมรถตู้ไปสัมมนาที่ชลบุรี วันที่ 5-7 ก.ย. ครับ เมลผม employee@equipflow.local"*  
>  
> 🤖 **AI (เรียก Tool `search_available_assets` และ `get_category_requirements`)**:  
> *"พบรถตู้ **Toyota Commuter VIP Van (1นข-9922)** ว่างพร้อมใช้งานครับ! เพื่อให้ผมส่งคำขอไปยัง **แผนกธุรการ / ยานพาหนะ** รบกวนขอข้อมูลเพิ่มเติมดังนี้ครับ:*  
> *1. เส้นทางและสถานที่ปลายทางที่เดินทางไป*  
> *2. จำนวนผู้โดยสารและรายชื่อ*  
> *3. รูปแบบการขับขี่: ขับเอง (Self-Drive) หรือขอพนักงานขับรถ (With Driver)*  
> *4. เลขที่ใบขับขี่ (กรณีเลือกขับเอง)*"  
>  
> 👤 **พนักงาน**: *"ไปโรงแรมดุสิตธานี พัทยา มีผู้โดยสาร 4 คน (สมศักดิ์, วรัญญา, ณัฐพล, พิมพา) ขับเอง เลขใบขับขี่ 65-12345678 ครับ"*  
>  
> 🤖 **AI (เรียก Tool `submit_borrow_request`)**:  
> *"ยื่นคำขอยืมอุปกรณ์สำเร็จเรียบร้อยครับ! 🎉*  
> • **เลขที่คำขอ**: `REQ-202609-8821`  
> • **อุปกรณ์**: Toyota Commuter VIP Van  
> • **สถานะ**: `PENDING (รอแผนกธุรการตรวจสอบ)`  
> *ระบบได้ส่งแจ้งเตือนไปยังแอปพลิเคชันและอีเมลของคุณแล้วครับ"*

---

### ตัวอย่างที่ 2: เช็คสถานะคำขอยืม
> 👤 **พนักงาน**: *"ช่วยเช็คสถานะคำขอยืมของ employee@equipflow.local หน่อยครับ"*  
>  
> 🤖 **AI (เรียก Tool `get_my_borrow_requests`)**:  
> *"พบรายการคำขอยืมของคุณดังนี้ครับ:*  
> 1. `REQ-202609-8821`: Toyota Commuter VIP Van ➔ **PENDING** (รออนุมัติ)  
> 2. `REQ-202608-4512`: Herman Miller Aeron Chair ➔ **BORROWED** (กำลังใช้งาน)*"
