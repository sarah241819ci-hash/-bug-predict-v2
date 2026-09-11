import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShieldAlert, AlertTriangle, CheckCircle,
  BarChart2, GitCommit, Users, Code2, Info,
  TrendingUp, Layers, Wrench, Shield
} from "lucide-react";
import DownloadReportButton from "./DownloadReportButton";

// ── helpers ────────────────────────────────────────────────
function healthScore(risk: number) { return Math.round((1 - risk) * 100); }

function techDebtLabel(totalLoc: number, avgComplexity: number) {
  const debt = totalLoc * avgComplexity;
  if (debt > 50000) return { label: "High", color: "text-red-500" };
  if (debt > 15000) return { label: "Moderate", color: "text-amber-500" };
  return { label: "Low", color: "text-emerald-500" };
}

function langFromExt(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    py: "Python", js: "JavaScript", ts: "TypeScript", tsx: "TypeScript/React",
    jsx: "JavaScript/React", java: "Java", go: "Go", cpp: "C++",
    c: "C", cs: "C#", php: "PHP", rb: "Ruby",
  };
  return map[ext] ?? ext.toUpperCase();
}

const RISK_COLOR = {
  HIGH: {
    badge: "bg-red-500/10 text-red-500 border border-red-500/20",
    bar: "bg-red-500",
    icon: ShieldAlert,
    text: "text-red-500",
  },
  MEDIUM: {
    badge: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    bar: "bg-amber-500",
    icon: AlertTriangle,
    text: "text-amber-500",
  },
  LOW: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    bar: "bg-emerald-500",
    icon: CheckCircle,
    text: "text-emerald-500",
  },
};

// ── page ───────────────────────────────────────────────────
export default async function AnalysisResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: { files: { orderBy: { risk_score: "desc" } } },
  });

  if (!analysis || analysis.user_id !== session.user.id) {
    return (
      <div className="p-12 text-center text-gray-500 dark:text-slate-400">
        Analysis not found.
      </div>
    );
  }

  // ── computed metrics ──
  const rc = RISK_COLOR[analysis.risk_level as keyof typeof RISK_COLOR] ?? RISK_COLOR.LOW;
  const RiskIcon = rc.icon;
  const highCount = analysis.files.filter((f) => f.risk_level === "HIGH").length;
  const medCount = analysis.files.filter((f) => f.risk_level === "MEDIUM").length;
  const lowCount = analysis.files.filter((f) => f.risk_level === "LOW").length;
  const health = healthScore(analysis.overall_risk);

  const allMetrics = analysis.files.map((f) => f.metrics as any);
  const totalLoc = allMetrics.reduce((s: number, m: any) => s + (m?.loc ?? 0), 0);
  const avgComplexity =
    allMetrics.length > 0
      ? allMetrics.reduce((s: number, m: any) => s + (m?.cyclomatic_complexity ?? 1), 0) /
        allMetrics.length
      : 1;
  const debt = techDebtLabel(totalLoc, avgComplexity);

  // Language distribution
  const langMap: Record<string, number> = {};
  analysis.files.forEach((f) => {
    const lang = langFromExt(f.file_path);
    langMap[lang] = (langMap[lang] ?? 0) + 1;
  });
  const langs = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top risky directories
  const dirMap: Record<string, { count: number; totalRisk: number }> = {};
  analysis.files.forEach((f) => {
    const dir = f.file_path.includes("/")
      ? f.file_path.split("/").slice(0, -1).join("/")
      : "(root)";
    if (!dirMap[dir]) dirMap[dir] = { count: 0, totalRisk: 0 };
    dirMap[dir].count++;
    dirMap[dir].totalRisk += f.risk_score;
  });
  const hotDirs = Object.entries(dirMap)
    .map(([dir, { count, totalRisk }]) => ({ dir, avgRisk: totalRisk / count, count }))
    .sort((a, b) => b.avgRisk - a.avgRisk)
    .slice(0, 4);

  const archScore = Math.max(0, Math.round(100 - (avgComplexity - 1) * 4));

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </Link>

      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">
              Repository Analysis
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {analysis.repository_name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Analyzed {new Date(analysis.created_at).toLocaleString()} ·{" "}
              {analysis.files.length} files scanned
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0 ${rc.badge}`}
            >
              <RiskIcon className="h-4 w-4" />
              {Math.round(analysis.overall_risk * 100)}% Overall Risk · {analysis.risk_level}
            </span>
            <DownloadReportButton analysis={analysis} />
          </div>
        </div>

        {/* ── 4 score cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100 dark:divide-slate-700">
          {[
            {
              label: "Repository Health",
              value: `${health}%`,
              color: health >= 70 ? "text-emerald-500" : health >= 40 ? "text-amber-500" : "text-red-500",
              icon: Shield,
            },
            {
              label: "Architecture Score",
              value: `${archScore}/100`,
              color: archScore >= 70 ? "text-emerald-500" : archScore >= 40 ? "text-amber-500" : "text-red-500",
              icon: Layers,
            },
            {
              label: "Technical Debt",
              value: debt.label,
              color: debt.color,
              icon: Wrench,
            },
            {
              label: "Avg Complexity",
              value: avgComplexity.toFixed(1),
              color: avgComplexity > 10 ? "text-red-500" : avgComplexity > 5 ? "text-amber-500" : "text-emerald-500",
              icon: TrendingUp,
            },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="px-4 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-gray-400" />
                <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  {label}
                </p>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Risk Summary Row ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "High Risk Files", count: highCount, color: "bg-red-500/10 text-red-500 border-red-500/20" },
          { label: "Medium Risk Files", count: medCount, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
          { label: "Healthy Files", count: lowCount, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
        ].map(({ label, count, color }) => (
          <div
            key={label}
            className={`rounded-2xl border p-5 text-center ${color}`}
          >
            <p className="text-3xl font-bold">{count}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1 opacity-80">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Insights Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">
            Language Distribution
          </h3>
          <div className="space-y-3">
            {langs.map(([lang, count]) => {
              const pct = Math.round((count / analysis.files.length) * 100);
              return (
                <div key={lang}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 dark:text-slate-200">{lang}</span>
                    <span className="text-gray-500 dark:text-slate-400">
                      {count} file{count > 1 ? "s" : ""} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hotspot Directories */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">
            Risk Hotspot Areas
          </h3>
          <div className="space-y-3">
            {hotDirs.map(({ dir, avgRisk, count }) => {
              const pct = Math.round(avgRisk * 100);
              const color =
                pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={dir}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-mono text-xs text-gray-700 dark:text-slate-300 truncate max-w-[60%]">
                      /{dir}
                    </span>
                    <span className="text-gray-500 dark:text-slate-400">
                      {count} files · {pct}% risk
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {hotDirs.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-slate-500">No directory data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── File-by-File Report ── */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white pt-2">
        File-by-File Risk Report
      </h2>

      <div className="space-y-3">
        {analysis.files.map((file) => {
          const fc = RISK_COLOR[file.risk_level as keyof typeof RISK_COLOR] ?? RISK_COLOR.LOW;
          const FileIcon = fc.icon;
          const metrics = file.metrics as any;

          return (
            <details
              key={file.id}
              className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              <summary className="px-5 py-4 flex items-center justify-between cursor-pointer list-none hover:bg-gray-50/60 dark:hover:bg-slate-700/40 transition-colors select-none">
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon
                    className={`h-4 w-4 flex-shrink-0 ${
                      file.risk_level === "HIGH"
                        ? "text-red-500"
                        : file.risk_level === "MEDIUM"
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate font-mono">
                    {file.file_path}
                  </span>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${fc.bar} rounded-full`}
                        style={{ width: `${Math.round(file.risk_score * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-600 dark:text-slate-300 w-8 text-right">
                      {Math.round(file.risk_score * 100)}%
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold ${fc.badge}`}
                  >
                    {file.risk_level}
                  </span>
                  <svg
                    className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>

              <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-4">
                {/* AI Explanations */}
                {file.ai_explanation ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-widest mb-2">
                        Why This Is Risky
                      </h5>
                      <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                        {file.ai_explanation}
                      </p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-2">
                        Recommended Action
                      </h5>
                      <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                        {file.test_suggestions ||
                          "Review this file during your next sprint and ensure test coverage for all public methods."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-400 italic">
                    This file appears healthy. No immediate action required.
                  </p>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { icon: Code2, label: "LOC", value: metrics?.loc ?? "—" },
                    {
                      icon: BarChart2,
                      label: "Complexity",
                      value:
                        typeof metrics?.cyclomatic_complexity === "number"
                          ? (Math.round(metrics.cyclomatic_complexity * 10) / 10).toString()
                          : "—",
                    },
                    { icon: GitCommit, label: "Commits", value: metrics?.commit_count ?? "—" },
                    { icon: Users, label: "Contributors", value: metrics?.contributor_count ?? "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                          {label}
                        </span>
                      </div>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>


    </div>
  );
}
