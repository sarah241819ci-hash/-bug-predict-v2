"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", { redirect: false, email, password });

    if (res?.error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/analyze");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 relative overflow-hidden">
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
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Welcome back. Sign in to your account.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                id="email" name="email" type="email" autoComplete="email" required
                className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:text-sm transition-colors"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password" name="password" type="password" autoComplete="current-password" required
                className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:text-sm transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-60 transition-colors"
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : "Sign in"}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                Sign up free
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
