"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, History, Sun, Moon, LogOut,
  Menu, X, BookOpen, PlusCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => setMounted(true), []);

  if (status === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const navItems = [
    { name: "New Analysis", href: "/analyze", icon: PlusCircle },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "History", href: "/history", icon: History },
    { name: "Metrics Glossary", href: "/glossary", icon: BookOpen },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 transition-colors">

      {/* ── Sidebar ── */}
      <aside
        className={`bg-gradient-to-b from-[#4338ca] to-[#a855f7] dark:from-[#312e81] dark:to-[#581c87] text-white flex flex-col transition-all duration-300 ease-in-out shadow-xl flex-shrink-0 ${
          isSidebarOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Logo + Toggle */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-indigo-600/50">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded relative shrink-0">
                <img src="/brand_logo.png" alt="Bug Predict Logo" className="object-contain w-full h-full" />
              </div>
              <span className="text-lg font-bold tracking-tight truncate">Bug Predict</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-indigo-600/60 rounded-lg transition-colors flex-shrink-0 ml-auto"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={`flex items-center py-2.5 rounded-xl transition-colors ${
                  isSidebarOpen ? "px-3 gap-3" : "justify-center px-0"
                } ${
                  isActive
                    ? "bg-white/15 text-white font-semibold"
                    : "text-indigo-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {isSidebarOpen && <span className="text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="px-2 py-3 border-t border-indigo-600/40">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign Out"
            className={`flex items-center w-full py-2.5 rounded-xl text-indigo-200 hover:bg-white/10 hover:text-white transition-colors ${
              isSidebarOpen ? "px-3 gap-3" : "justify-center px-0"
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-end px-6 flex-shrink-0 shadow-sm z-10">

          <div className="flex items-center gap-5">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-200 font-bold text-sm">
                {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
                {session.user?.name || "User"}
              </span>
            </div>
          </div>
        </header>

        {/* Subtle background glow */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl opacity-10 pointer-events-none">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#818cf8] to-[#a78bfa]" />
          </div>
          <main className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
