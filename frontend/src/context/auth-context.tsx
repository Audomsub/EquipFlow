"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, UserRole } from "@/types";
import { apiClient } from "@/lib/api";

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithPassword: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithPassword: (email: string, pass: string, fullName: string, targetRole?: UserRole) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("EMPLOYEE");
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Sync Supabase Auth session & Profile
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          // Fetch profile from DB
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profile) {
            setUser(profile);
            setRole(profile.role);
            apiClient.defaults.headers.common["X-Dev-Role"] = profile.role;
          } else {
            const uRole = (session.user.user_metadata?.role as UserRole) || "EMPLOYEE";
            const newP: Profile = {
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || "Enterprise User",
              role: uRole,
              is_active: true,
              created_at: new Date().toISOString(),
            };
            setUser(newP);
            setRole(uRole);
            apiClient.defaults.headers.common["X-Dev-Role"] = uRole;
          }
        } else {
          // No active session: Not authenticated
          setIsAuthenticated(false);
          setUser(null);
          setRole("EMPLOYEE");
          delete apiClient.defaults.headers.common["X-Dev-Role"];
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUser(profile);
          setRole(profile.role);
          apiClient.defaults.headers.common["X-Dev-Role"] = profile.role;
        } else {
          const metaRole = (session.user.user_metadata?.role as UserRole) || (session.user.email?.includes("admin") ? "SUPER_ADMIN" : "EMPLOYEE");
          const fallbackProfile: Profile = {
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name || "Super Administrator",
            role: metaRole,
            is_active: true,
            created_at: new Date().toISOString(),
          };
          setUser(fallbackProfile);
          setRole(metaRole);
          apiClient.defaults.headers.common["X-Dev-Role"] = metaRole;
        }
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    apiClient.defaults.headers.common["X-Dev-Role"] = newRole;
    if (user) {
      setUser({
        ...user,
        role: newRole,
        full_name:
          newRole === "SUPER_ADMIN"
            ? "Super Administrator"
            : newRole === "IT_ADMIN"
            ? "IT Admin User"
            : "John Doe (Employee)",
      });
    }
  };

  const signInWithPassword = async (email: string, pass: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setIsAuthenticated(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profile) {
          setUser(profile);
          setRole(profile.role);
          apiClient.defaults.headers.common["X-Dev-Role"] = profile.role;
        } else {
          // If profile query returned empty, read role from user_metadata or email check
          const metaRole = (data.user.user_metadata?.role as UserRole) || (data.user.email?.includes("admin") ? "SUPER_ADMIN" : "EMPLOYEE");
          const fallbackProfile: Profile = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || "Super Administrator",
            role: metaRole,
            is_active: true,
            created_at: new Date().toISOString(),
          };
          setUser(fallbackProfile);
          setRole(metaRole);
          apiClient.defaults.headers.common["X-Dev-Role"] = metaRole;
        }
      }
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to sign in" };
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithPassword = async (
    email: string,
    pass: string,
    fullName: string,
    targetRole: UserRole = "EMPLOYEE"
  ): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
            role: targetRole,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setIsAuthenticated(true);
        const newProfile: Profile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName,
          role: targetRole,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setUser(newProfile);
        setRole(targetRole);
        apiClient.defaults.headers.common["X-Dev-Role"] = targetRole;
      }

      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to sign up" };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    switchRole("EMPLOYEE");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAuthenticated,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
