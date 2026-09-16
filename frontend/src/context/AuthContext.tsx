"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export interface UserProfile {
  id?: string;
  user_id: string;
  name: string;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // isConfigured: true when env vars are real Supabase values (not placeholders).
  // Accepts both classic JWT anon keys (eyJ...) and new publishable keys (sb_publishable_...).
  const isConfigured = Boolean(
    supabaseUrl &&
      supabaseUrl.startsWith("https://") &&
      supabaseUrl.includes(".supabase.co") &&
      !supabaseUrl.includes("your-") &&
      !supabaseUrl.includes("placeholder") &&
      supabaseAnonKey &&
      (supabaseAnonKey.startsWith("sb_publishable_") || supabaseAnonKey.startsWith("eyJ")) &&
      !supabaseAnonKey.includes("your-") &&
      !supabaseAnonKey.includes("placeholder")
  );

  const fetchProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();

      if (data) {
        setProfile(data);
      } else {
        // Fallback profile if profile row does not exist yet
        const fallbackName =
          currentUser.user_metadata?.name ||
          currentUser.email?.split("@")[0] ||
          "Researcher User";
        setProfile({
          user_id: currentUser.id,
          name: fallbackName,
        });
      }
    } catch {
      const fallbackName =
        currentUser.user_metadata?.name ||
        currentUser.email?.split("@")[0] ||
        "Researcher User";
      setProfile({
        user_id: currentUser.id,
        name: fallbackName,
      });
    }
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth session check error:", err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (!isConfigured) {
      // Friendly simulation mode for unconfigured environment keys
      if (email && password.length >= 6) {
        const mockUser = {
          id: "mock-user-id-123",
          email,
          user_metadata: { name: email.split("@")[0] },
        } as unknown as User;
        setUser(mockUser);
        setProfile({ user_id: mockUser.id, name: email.split("@")[0] });
        return { success: true };
      }
      return {
        success: false,
        error: "Please enter a valid email and password (minimum 6 characters).",
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          return { success: false, error: "Incorrect email address or password." };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user);
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Network error occurred during login. Please try again.",
      };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    if (!isConfigured) {
      // Friendly simulation mode for unconfigured environment keys
      const mockUser = {
        id: "mock-user-id-" + Date.now(),
        email,
        user_metadata: { name },
      } as unknown as User;
      setUser(mockUser);
      setProfile({ user_id: mockUser.id, name });
      return { success: true };
    }

    try {
      // 1. Sign up with Supabase Auth (Send ONLY email and password, store name in user_metadata)
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          return { success: false, error: "An account with this email address already exists." };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);

        // 2. Create profile record in profiles table
        try {
          const { error: profileError } = await supabase.from("profiles").insert([
            {
              user_id: data.user.id,
              name: name.trim(),
            },
          ]);
          if (!profileError) {
            setProfile({ user_id: data.user.id, name: name.trim() });
          } else {
            setProfile({ user_id: data.user.id, name: name.trim() });
          }
        } catch {
          setProfile({ user_id: data.user.id, name: name.trim() });
        }
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to create account. Please check your connection and try again.",
      };
    }
  };

  const logout = async () => {
    try {
      if (isConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setProfile(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isConfigured,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
