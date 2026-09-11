"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide the marketing header if logged in (they get the dashboard sidebar instead)
  if (session) return null;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">Bug Predict</span>
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {mounted ? (
                theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
              ) : (
                <div className="h-5 w-5" />
              )}
            </button>
            <div className="flex space-x-4">
              <Link href="/login" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium px-3 py-2 transition-colors">
                Log in
              </Link>
              <Link href="/signup" className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
