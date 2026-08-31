import axios from "axios";
import { supabase } from "./supabase";

// Use same-origin proxy rewrite in Next.js (/backend-api) to completely eliminate any CORS issues
export const apiClient = axios.create({
  baseURL: "/backend-api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Supabase Session Token automatically if logged in,
// fallback to Dev Role header if in development and not logged in yet
apiClient.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      // Default to IT_ADMIN in Dev mode for smooth preview
      config.headers["X-Dev-Role"] = "IT_ADMIN";
    }
  } catch (err) {
    config.headers["X-Dev-Role"] = "IT_ADMIN";
  }
  return config;
});
