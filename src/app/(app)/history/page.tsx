import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Clock, ArrowRight, ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const analyses = await prisma.analysis.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: "desc" },
    include: { files: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Analysis History
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {analyses.length} {analyses.length === 1 ? "repository" : "repositories"} analysed
          </p>
        </div>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          + New Analysis
        </Link>
      </div>

      {analyses.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-700">
          {analyses.map((analysis) => {
            const highCount = analysis.files.filter((f) => f.risk_level === "HIGH").length;
            const medCount = analysis.files.filter((f) => f.risk_level === "MEDIUM").length;
            const lowCount = analysis.files.filter((f) => f.risk_level === "LOW").length;
            const riskPct = Math.round(analysis.overall_risk * 100);

            const badgeColor =
              analysis.risk_level === "HIGH"
                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                : analysis.risk_level === "MEDIUM"
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";

            const barColor =
              analysis.risk_level === "HIGH"
                ? "bg-red-500"
                : analysis.risk_level === "MEDIUM"
                ? "bg-amber-500"
                : "bg-emerald-500";

            return (
              <Link
                key={analysis.id}
                href={`/analysis/${analysis.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors group"
              >
                {/* Left */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {analysis.repository_name}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(analysis.created_at).toLocaleString()} ·{" "}
                    {analysis.files.length} files
                  </div>

                  {/* Mini breakdown */}
                  <div className="flex items-center gap-3 pt-0.5">
                    {highCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <ShieldAlert className="h-3 w-3" /> {highCount} high
                      </span>
                    )}
                    {medCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <AlertTriangle className="h-3 w-3" /> {medCount} medium
                      </span>
                    )}
                    {lowCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <CheckCircle className="h-3 w-3" /> {lowCount} healthy
                      </span>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Risk bar */}
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-500 dark:text-slate-400">{riskPct}% risk</span>
                    <div className="w-24 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full`}
                        style={{ width: `${riskPct}%` }}
                      />
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${badgeColor}`}>
                    {analysis.risk_level}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-16 text-center">
          <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-6 w-6 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">No history yet</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Run your first analysis to see results here.
          </p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            Start Analysing
          </Link>
        </div>
      )}
    </div>
  );
}
