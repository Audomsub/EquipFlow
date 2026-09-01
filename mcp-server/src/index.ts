import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://aqvlduohmgnxlwocmsde.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdmxkdW9obWdueGx3b2Ntc2RlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk5OTYwMCwiZXhwIjoyMDg3NTc1NjAwfQ.p0j_yJ7fD35eO0fQ06d6xYw8P6jV89PzY2JtN4d8v9Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const server = new Server(
  {
    name: "equipflow-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// -----------------------------------------------------------------------------
// 1. Tool Definitions
// -----------------------------------------------------------------------------
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_categories",
        description: "List all 6 enterprise asset categories with their description and custodian department. Use this to discover what types of equipment are available in EquipFlow.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_category_requirements",
        description: "Get the exact required form inputs and inspection checklist for an asset category. Always call this BEFORE submitting a borrow request to know what mandatory questions to ask the employee.",
        inputSchema: {
          type: "object",
          properties: {
            category_name_or_id: {
              type: "string",
              description: "Category name (e.g., 'ยานพาหนะส่วนกลาง', 'Fleet & Vehicles', 'ห้องประชุม', 'AV & Media', 'เครื่องมือช่าง', 'เอกสารสำคัญ', 'Ergonomics') or category UUID",
            },
          },
          required: ["category_name_or_id"],
        },
      },
      {
        name: "search_available_assets",
        description: "Search available equipment by keyword (e.g. 'รถตู้', 'Van', 'MacBook', 'Sony FX3', 'สว่าน', 'Aeron', 'ห้องประชุม') or category ID. Returns matching assets with status, specs, and condition.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search keyword for asset name, model, or brand",
            },
            category_id: {
              type: "string",
              description: "Optional UUID of the category to filter by",
            },
            status: {
              type: "string",
              description: "Filter by status (default: 'AVAILABLE', or 'BORROWED', 'MAINTENANCE')",
            },
          },
        },
      },
      {
        name: "check_asset_availability",
        description: "Check if a specific asset is free (not double-booked) during the requested date range.",
        inputSchema: {
          type: "object",
          properties: {
            asset_id: {
              type: "string",
              description: "UUID of the asset to check",
            },
            start_date: {
              type: "string",
              description: "Start timestamp in ISO 8601 format (e.g. '2026-09-05T09:00:00Z')",
            },
            end_date: {
              type: "string",
              description: "End timestamp in ISO 8601 format (e.g. '2026-09-07T18:00:00Z')",
            },
          },
          required: ["asset_id", "start_date", "end_date"],
        },
      },
      {
        name: "submit_borrow_request",
        description: "Submit an enterprise equipment borrow request. Validates required category data and creates the reservation.",
        inputSchema: {
          type: "object",
          properties: {
            user_email: {
              type: "string",
              description: "Corporate email of the employee requesting the equipment",
            },
            asset_id: {
              type: "string",
              description: "UUID of the asset to borrow",
            },
            purpose: {
              type: "string",
              description: "General purpose or business justification for borrowing",
            },
            start_date: {
              type: "string",
              description: "Start timestamp in ISO 8601 format",
            },
            end_date: {
              type: "string",
              description: "End timestamp in ISO 8601 format",
            },
            request_data: {
              type: "object",
              description: "Category-specific dynamic fields (e.g., { destination: 'ระยอง', passengers: '4 คน', driving_mode: 'ขับเอง (Self-Drive)', drivers_license_no: '65-01234567' })",
            },
          },
          required: ["user_email", "asset_id", "purpose", "start_date", "end_date"],
        },
      },
      {
        name: "get_my_borrow_requests",
        description: "Retrieve all active and past borrow requests for a specific employee by email.",
        inputSchema: {
          type: "object",
          properties: {
            user_email: {
              type: "string",
              description: "Corporate email of the employee",
            },
          },
          required: ["user_email"],
        },
      },
      {
        name: "admin_review_request",
        description: "Approve or reject a pending borrow request. Used by Custodians / IT Admins.",
        inputSchema: {
          type: "object",
          properties: {
            reviewer_email: {
              type: "string",
              description: "Email of the admin/custodian reviewer",
            },
            request_number_or_id: {
              type: "string",
              description: "Request number (e.g. 'REQ-202609-1234') or request UUID",
            },
            action: {
              type: "string",
              enum: ["APPROVED", "REJECTED"],
              description: "Action to take",
            },
            rejection_reason: {
              type: "string",
              description: "Reason if rejecting the request",
            },
          },
          required: ["reviewer_email", "request_number_or_id", "action"],
        },
      },
    ],
  };
});

// -----------------------------------------------------------------------------
// 2. Tool Execution Handlers
// -----------------------------------------------------------------------------
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // TOOL 1: list_categories
    if (name === "list_categories") {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, description, icon, custodian_department, required_form_fields, checklist_template")
        .order("name", { ascending: true });

      if (error) throw error;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "success",
                total_categories: data?.length || 0,
                categories: data?.map((c) => ({
                  id: c.id,
                  name: c.name,
                  description: c.description,
                  custodian: c.custodian_department,
                  fields_count: (c.required_form_fields as any[])?.length || 0,
                  checklist_items_count: (c.checklist_template as any[])?.length || 0,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // TOOL 2: get_category_requirements
    if (name === "get_category_requirements") {
      const { category_name_or_id } = args as { category_name_or_id: string };

      let query = supabase.from("categories").select("*");
      if (category_name_or_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query = query.eq("id", category_name_or_id);
      } else {
        query = query.ilike("name", `%${category_name_or_id}%`);
      }

      const { data, error } = await query.single();
      if (error || !data) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Category not found for '${category_name_or_id}'` }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "success",
                category_id: data.id,
                category_name: data.name,
                description: data.description,
                custodian: data.custodian_department,
                required_form_fields: data.required_form_fields || [],
                inspection_checklist: data.checklist_template || [],
                instructions_for_ai: `When an employee requests equipment in this category, please ask them for each field in 'required_form_fields' before calling submit_borrow_request.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // TOOL 3: search_available_assets
    if (name === "search_available_assets") {
      const { query, category_id, status = "AVAILABLE" } = (args || {}) as {
        query?: string;
        category_id?: string;
        status?: string;
      };

      let dbQuery = supabase
        .from("assets")
        .select("id, asset_tag, name, brand, model, status, current_condition, is_borrowable, notes, category:categories(id, name, custodian_department)")
        .eq("is_borrowable", true);

      if (status && status !== "ALL") {
        dbQuery = dbQuery.eq("status", status);
      }

      if (category_id) {
        dbQuery = dbQuery.eq("category_id", category_id);
      }

      if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%,asset_tag.ilike.%${query}%,notes.ilike.%${query}%`);
      }

      const { data, error } = await dbQuery.limit(20);
      if (error) throw error;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "success",
                matched_count: data?.length || 0,
                assets: data,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // TOOL 4: check_asset_availability
    if (name === "check_asset_availability") {
      const { asset_id, start_date, end_date } = args as {
        asset_id: string;
        start_date: string;
        end_date: string;
      };

      // Check conflicting requests (APPROVED or BORROWED)
      const { data: conflicts, error } = await supabase
        .from("borrow_requests")
        .select("id, request_number, start_date, end_date, status")
        .eq("asset_id", asset_id)
        .in("status", ["APPROVED", "BORROWED"])
        .lt("start_date", end_date)
        .gt("end_date", start_date);

      if (error) throw error;

      const isAvailable = (conflicts?.length || 0) === 0;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "success",
                is_available: isAvailable,
                message: isAvailable
                  ? "Asset is free and available for booking during this period."
                  : `Conflict detected with ${conflicts?.length} active reservation(s).`,
                conflicting_reservations: conflicts || [],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // TOOL 5: submit_borrow_request
    if (name === "submit_borrow_request") {
      const { user_email, asset_id, purpose, start_date, end_date, request_data = {} } = args as {
        user_email: string;
        asset_id: string;
        purpose: string;
        start_date: string;
        end_date: string;
        request_data?: Record<string, any>;
      };

      // 1. Find profile by email
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("email", user_email)
        .single();

      if (profileErr || !profile) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `User profile with email '${user_email}' not found in EquipFlow.` }),
            },
          ],
        };
      }

      // 2. Fetch Asset & Category
      const { data: asset, error: assetErr } = await supabase
        .from("assets")
        .select("id, name, asset_tag, status, is_borrowable, category:categories(id, name, required_form_fields, custodian_department)")
        .eq("id", asset_id)
        .single();

      if (assetErr || !asset) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Asset with ID '${asset_id}' not found.` }),
            },
          ],
        };
      }

      // 3. Check Date Overlap Conflict
      const { data: conflicts } = await supabase
        .from("borrow_requests")
        .select("id")
        .eq("asset_id", asset_id)
        .in("status", ["APPROVED", "BORROWED"])
        .lt("start_date", end_date)
        .gt("end_date", start_date);

      if (conflicts && conflicts.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Cannot book: Asset '${asset.name}' is already reserved during the requested period.`,
              }),
            },
          ],
        };
      }

      // 4. Generate Request Number
      const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      const requestNumber = `REQ-${dateStr}-${randDigits}`;

      // 5. Insert Borrow Request
      const { data: newReq, error: insertErr } = await supabase
        .from("borrow_requests")
        .insert({
          request_number: requestNumber,
          user_id: profile.id,
          asset_id: asset.id,
          purpose,
          request_data,
          start_date,
          end_date,
          status: "PENDING",
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 6. Create in-app notification
      await supabase.from("notifications").insert({
        user_id: profile.id,
        title: "ยื่นคำขอยืมผ่าน AI Assistant สำเร็จ 🤖",
        message: `คำขอเลขที่ ${requestNumber} สำหรับ '${asset.name}' ถูกบันทึกเข้าระบบเรียบร้อยแล้ว อยู่ระหว่างรอตรวจสอบ`,
        type: "INFO",
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "success",
                message: "Borrow request successfully submitted to EquipFlow!",
                request_number: requestNumber,
                details: {
                  request_id: newReq.id,
                  applicant: profile.full_name,
                  equipment: asset.name,
                  asset_tag: asset.asset_tag,
                  category: (asset.category as any)?.name,
                  custodian: (asset.category as any)?.custodian_department,
                  borrow_period: `${new Date(start_date).toLocaleString()} ถึง ${new Date(end_date).toLocaleString()}`,
                  purpose,
                  custom_fields: request_data,
                  approval_status: "PENDING (รอเจ้าหน้าที่ตรวจสอบ)",
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // TOOL 6: get_my_borrow_requests
    if (name === "get_my_borrow_requests") {
      const { user_email } = args as { user_email: string };

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", user_email)
        .single();

      if (!profile) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `User profile with email '${user_email}' not found.` }),
            },
          ],
        };
      }

      const { data: requests, error } = await supabase
        .from("borrow_requests")
        .select("id, request_number, purpose, request_data, start_date, end_date, status, rejection_reason, created_at, asset:assets(id, name, asset_tag, category:categories(name))")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "success",
                total: requests?.length || 0,
                requests: requests?.map((r) => ({
                  request_number: r.request_number,
                  equipment: (r.asset as any)?.name,
                  asset_tag: (r.asset as any)?.asset_tag,
                  category: (r.asset as any)?.category?.name,
                  status: r.status,
                  period: `${new Date(r.start_date).toLocaleDateString()} - ${new Date(r.end_date).toLocaleDateString()}`,
                  purpose: r.purpose,
                  rejection_reason: r.rejection_reason || null,
                  submitted_at: r.created_at,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // TOOL 7: admin_review_request
    if (name === "admin_review_request") {
      const { reviewer_email, request_number_or_id, action, rejection_reason } = args as {
        reviewer_email: string;
        request_number_or_id: string;
        action: "APPROVED" | "REJECTED";
        rejection_reason?: string;
      };

      // 1. Verify reviewer is admin
      const { data: reviewer } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", reviewer_email)
        .single();

      if (!reviewer || (reviewer.role !== "IT_ADMIN" && reviewer.role !== "SUPER_ADMIN")) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Reviewer '${reviewer_email}' does not have IT_ADMIN or SUPER_ADMIN permissions.` }),
            },
          ],
        };
      }

      // 2. Find request
      let query = supabase.from("borrow_requests").select("*, asset:assets(name)");
      if (request_number_or_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query = query.eq("id", request_number_or_id);
      } else {
        query = query.eq("request_number", request_number_or_id);
      }

      const { data: reqToReview, error: findErr } = await query.single();
      if (findErr || !reqToReview) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Request '${request_number_or_id}' not found.` }),
            },
          ],
        };
      }

      // 3. Update status
      const { data: updated, error: updateErr } = await supabase
        .from("borrow_requests")
        .update({
          status: action,
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: action === "REJECTED" ? rejection_reason || "ไม่ระบุเหตุผล" : null,
        })
        .eq("id", reqToReview.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // 4. Notification to Applicant
      await supabase.from("notifications").insert({
        user_id: reqToReview.user_id,
        title: action === "APPROVED" ? "คำขอยืมอุปกรณ์ได้รับการอนุมัติ 🎉" : "คำขอยืมอุปกรณ์ถูกปฏิเสธ ⚠️",
        message:
          action === "APPROVED"
            ? `คำขอ ${reqToReview.request_number} สำหรับ '${(reqToReview.asset as any)?.name}' ได้รับการอนุมัติแล้ว`
            : `คำขอ ${reqToReview.request_number} ถูกปฏิเสธ: ${rejection_reason || "ไม่ระบุเหตุผล"}`,
        type: action === "APPROVED" ? "SUCCESS" : "ALERT",
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "success",
                message: `Request ${reqToReview.request_number} has been ${action}.`,
                request_number: reqToReview.request_number,
                new_status: action,
                reviewed_by: reviewer_email,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: err.message || "An unexpected error occurred" }),
        },
      ],
      isError: true,
    };
  }
});

// -----------------------------------------------------------------------------
// 3. Start Server
// -----------------------------------------------------------------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 EquipFlow MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error running EquipFlow MCP Server:", err);
  process.exit(1);
});
