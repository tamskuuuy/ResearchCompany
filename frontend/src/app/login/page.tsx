"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isConfigured } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        router.push("/dashboard");
      } else {
        setError(res.error || "Authentication failed. Please check your credentials.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-[#EEF2FF] selection:text-[#0000CD]">
      {/* Top Branding Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-2">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0000CD] flex items-center justify-center text-white shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-heading font-extrabold text-xl tracking-tight text-[#111111]">
            Research<span className="text-[#FF7F00]">Company</span>
          </span>
        </Link>
        <Link href="/signup">
          <Button variant="ghost" size="sm">
            Create Account
          </Button>
        </Link>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-1 flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 sm:p-10 shadow-md border-[#E5E7EB] space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#111111] tracking-tight">
                Welcome Back
              </h1>
              <p className="text-sm text-gray-500">
                Log in to access your ResearchCompany workspace
              </p>

              {!isConfigured && (
                <div className="pt-1">
                  <Badge variant="accent" className="text-[10px]">
                    Preview Auth Mode (Supabase Keys Unset)
                  </Badge>
                </div>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <Input
                label="Email Address"
                type="email"
                placeholder="researcher@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
                disabled={isSubmitting}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
                disabled={isSubmitting}
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#0000CD] focus:ring-[#0000CD]"
                  />
                  <span>Remember session</span>
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => e.preventDefault()}
                  className="font-medium text-[#0000CD] hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  variant="primary"
                  type="submit"
                  fullWidth
                  size="lg"
                  icon={
                    isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )
                  }
                  iconPosition="right"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Authenticating..." : "Login to Workspace"}
                </Button>

                <Link href="/signup" className="block">
                  <Button variant="secondary" fullWidth size="lg" disabled={isSubmitting}>
                    Sign Up as New Researcher
                  </Button>
                </Link>
              </div>
            </form>

            <div className="pt-4 border-t border-[#E5E7EB] text-center">
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Protected by Supabase SSR Session Auth
              </p>
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-500 py-4">
        &copy; {new Date().getFullYear()} ResearchCompany Inc. Professional Academic Workspace.
      </footer>
    </div>
  );
}
