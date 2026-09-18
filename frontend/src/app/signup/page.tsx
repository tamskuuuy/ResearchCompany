"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, User, Mail, Lock, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup, isConfigured } = useAuth();
  const router = useRouter();

  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const validateEmail = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRequiresConfirmation(false);

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !validateEmail(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your password confirmation.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signup(name.trim(), email.trim(), password);

      if (res.success) {
        if (res.requiresConfirmation) {
          setRegisteredEmail(email.trim());
          setRequiresConfirmation(true);
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(res.error || "Failed to create account. Please check your details.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred during registration.");
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
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Existing Member? Log in
          </Button>
        </Link>
      </header>

      {/* Main Signup Form Container */}
      <main className="flex-1 flex items-center justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 sm:p-10 shadow-md border-[#E5E7EB] space-y-6">
            {requiresConfirmation ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-extrabold font-heading text-[#111111] tracking-tight">
                  Check Your Email
                </h1>
                <p className="text-sm text-gray-600">
                  We sent a confirmation link to <span className="font-semibold text-gray-900">{registeredEmail}</span>. Please click the link to verify your account.
                </p>
                <div className="pt-4">
                  <Link href="/login">
                    <Button variant="primary" fullWidth size="lg">
                      Go to Login Page
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#111111] tracking-tight">
                    Create Workspace Account
                  </h1>
                  <p className="text-sm text-gray-500">
                    Join ResearchCompany to structure and collaborate on research
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
                label="Full Name"
                type="text"
                placeholder="Dr. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
                disabled={isSubmitting}
              />

              <Input
                label="Academic / Institutional Email"
                type="email"
                placeholder="jane.doe@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
                disabled={isSubmitting}
              />

              <Input
                label="Password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
                disabled={isSubmitting}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                required
                disabled={isSubmitting}
              />

              <div className="pt-2 space-y-3">
                <Button
                  variant="accent"
                  type="submit"
                  fullWidth
                  size="lg"
                  icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Account..." : "Complete Registration"}
                </Button>

                <Link href="/login" className="block">
                  <Button variant="outline" fullWidth size="lg" disabled={isSubmitting}>
                    Back to Login
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
              </>
            )}
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
