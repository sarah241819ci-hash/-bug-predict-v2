"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2, ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        const signInRes = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (!signInRes?.error) {
          router.push("/analyze");
          router.refresh();
        } else {
          setError(signInRes.error || "Something went wrong");
        }
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "block w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:text-sm transition-colors";
  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1.5";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 py-8 relative overflow-hidden">
      {/* Background glow matching theme */}
      <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl opacity-20">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#4338ca] to-[#a855f7] sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-24 w-24 mb-1">
            <img src="/brand_logo.png" alt="Bug Predict" className="object-contain w-full h-full drop-shadow-xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Bug Predict</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Create a free account and start analyzing today.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="name">Full Name</label>
              <input id="name" name="name" type="text" autoComplete="name" required
                className={inputClass} placeholder="Jane Doe"
                value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>

            <div>
              <label className={labelClass} htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required
                className={inputClass} placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>

            <div>
              <label className={labelClass} htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required
                className={inputClass} placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            </div>

            <div>
              <label className={labelClass} htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required
                className={inputClass} placeholder="••••••••"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-60 transition-colors"
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...</> : "Create account"}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
