"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle2, Circle, Loader2, ArrowRight,
  ShieldAlert, AlertTriangle, CheckCircle, Search, X
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface CompletionData {
  analysisId: string;
  repositoryName: string;
  fileCount: number;
  highCount: number;
  medCount: number;
  lowCount: number;
  overallRisk: number;
  riskLevel: string;
}

// ── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "connect", label: "Connecting to repository", detail: "Authenticating with GitHub API..." },
  { id: "tree", label: "Scanning repository structure", detail: "Reading file tree and directory layout..." },
  { id: "detect", label: "Detecting programming languages", detail: "Identifying source files and extensions..." },
  { id: "complexity", label: "Analysing code complexity", detail: "Computing cyclomatic complexity and LOC for each file..." },
  { id: "churn", label: "Measuring commit churn", detail: "Fetching commit history for high-risk candidates..." },
  { id: "risk", label: "Calculating defect risk", detail: "Running XGBoost ML model on extracted features..." },
  { id: "ai", label: "Generating AI insights", detail: "Asking Gemini to explain the riskiest findings..." },
  { id: "save", label: "Saving report", detail: "Persisting results to database..." },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function AnalyzePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const initialUrl = searchParams.get("url") ?? "";

  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "done" | "error">(
    initialUrl ? "analyzing" : "idle"
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const cancelRef = useRef(false);

  // Auto-start if URL was passed in query string
  useEffect(() => {
    if (initialUrl && status === "authenticated") {
      runAnalysis(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function runAnalysis(url: string) {
    cancelRef.current = false;
    setPhase("analyzing");
    setCurrentStep(0);
    setError("");
    setCompletion(null);

    // Advance steps visually while the real fetch runs
    const stepTimings = [2000, 4000, 6000, 14000, 22000, 30000, 40000];
    const timers: ReturnType<typeof setTimeout>[] = [];
    stepTimings.forEach((delay, i) => {
      timers.push(setTimeout(() => {
        if (!cancelRef.current) setCurrentStep(i + 1);
      }, delay));
    });

    try {
      const res = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      timers.forEach(clearTimeout);
      if (cancelRef.current) return;

      setCurrentStep(STEPS.length - 1); // "Saving report..."
      await new Promise((r) => setTimeout(r, 600));

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Analysis failed. Please try again.");
      }

      const data = await res.json();
      if (!data.analysisId) throw new Error("Unexpected server response.");

      // Fetch the completed analysis for the summary card
      const summaryRes = await fetch(`/api/analysis/${data.analysisId}`);
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        setCompletion({
          analysisId: data.analysisId,
          repositoryName: summary.repository_name ?? url,
          fileCount: summary.file_count ?? 0,
          highCount: summary.high_count ?? 0,
          medCount: summary.med_count ?? 0,
          lowCount: summary.low_count ?? 0,
          overallRisk: summary.overall_risk ?? 0,
          riskLevel: summary.risk_level ?? "UNKNOWN",
        });
      } else {
        // Fallback if summary endpoint isn't ready yet
        setCompletion({
          analysisId: data.analysisId,
          repositoryName: url.replace("https://github.com/", ""),
          fileCount: 0, highCount: 0, medCount: 0, lowCount: 0,
          overallRisk: 0, riskLevel: "UNKNOWN",
        });
      }

      setCurrentStep(STEPS.length);
      setPhase("done");
    } catch (err: any) {
      timers.forEach(clearTimeout);
      if (cancelRef.current) return;
      setError(err.message ?? "An unexpected error occurred.");
      setPhase("error");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    // Update URL without full navigation
    window.history.pushState({}, "", `/analyze?url=${encodeURIComponent(inputUrl)}`);
    runAnalysis(inputUrl);
  }

  function handleReset() {
    cancelRef.current = true;
    setPhase("idle");
    setInputUrl("");
    setCurrentStep(0);
    setError("");
    setCompletion(null);
    window.history.pushState({}, "", "/analyze");
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // ── Idle: big clean input ─────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Analyze a Repository
            </h1>
            <p className="text-gray-500 dark:text-slate-400 mt-2 text-base">
              Paste a GitHub URL and our ML engine will scan every file for defect risk.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="flex rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center pl-5 text-gray-400">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="flex-1 px-4 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none text-base"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors flex-shrink-0"
              >
                Analyze →
              </button>
            </div>
          </form>

          <div className="flex items-center justify-center gap-6 text-xs text-gray-400 dark:text-slate-500 pt-2">
            <span>✓ All languages</span>
            <span>✓ ML-powered</span>
            <span>✓ AI explanations</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-800/40 p-8 text-center shadow-xl space-y-4">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analysis Failed</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800/30">
            {error}
          </p>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Done: Completion Summary ──────────────────────────────────────────────
  if (phase === "done" && completion) {
    const riskColor =
      completion.riskLevel === "HIGH"
        ? "text-red-500"
        : completion.riskLevel === "MEDIUM"
        ? "text-amber-500"
        : "text-emerald-500";

    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-5">
          {/* Success header */}
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="h-9 w-9 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analysis Complete</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-mono">
              {completion.repositoryName}
            </p>
          </div>

          {/* Summary card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                {completion.fileCount > 0 ? `${completion.fileCount} files analysed` : "Analysis complete"}
              </span>
              <span className={`text-sm font-bold ${riskColor}`}>
                {Math.round(completion.overallRisk * 100)}% overall risk
              </span>
            </div>
            <div className="px-6 py-5 space-y-3">
              {completion.highCount > 0 && (
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-slate-300">
                    <span className="font-bold text-red-500">{completion.highCount} high-risk</span>{" "}
                    {completion.highCount === 1 ? "area requires" : "areas require"} immediate attention
                  </p>
                </div>
              )}
              {completion.medCount > 0 && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-slate-300">
                    <span className="font-bold text-amber-500">{completion.medCount} medium-risk</span>{" "}
                    {completion.medCount === 1 ? "file" : "files"} to review in the next sprint
                  </p>
                </div>
              )}
              {completion.lowCount > 0 && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-slate-300">
                    <span className="font-bold text-emerald-500">{completion.lowCount} files</span>{" "}
                    are healthy and stable
                  </p>
                </div>
              )}
              {completion.highCount === 0 && completion.medCount === 0 && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-slate-300">
                    Repository looks healthy. No critical risks detected.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push(`/analysis/${completion.analysisId}`)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              View Full Report <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 font-semibold text-sm transition-colors"
            >
              Analyze Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Analyzing: ChatGPT-style progress ────────────────────────────────────
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Analyzing repository
          </h2>
          <p className="text-sm text-indigo-500 dark:text-indigo-400 font-mono truncate">
            {inputUrl.replace("https://github.com/", "")}
          </p>
        </div>

        {/* Steps list */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg overflow-hidden divide-y divide-gray-50 dark:divide-slate-700/60">
          {STEPS.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 px-6 py-4 transition-colors ${
                  active ? "bg-indigo-50/60 dark:bg-indigo-900/10" : ""
                }`}
              >
                {/* Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : active ? (
                    <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-200 dark:text-slate-600" />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold leading-snug ${
                      done
                        ? "text-gray-400 dark:text-slate-500 line-through"
                        : active
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-gray-300 dark:text-slate-600"
                    }`}
                  >
                    {step.label}
                  </p>
                  {active && (
                    <p className="text-xs text-indigo-500/80 dark:text-indigo-400/70 mt-0.5 italic">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mb-1.5">
            <span>Progress</span>
            <span>{Math.round((currentStep / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-[2000ms] ease-out"
              style={{ width: `${Math.round((currentStep / STEPS.length) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-400 dark:text-slate-500 mt-2 italic">
            This may take 30–90 seconds for large repositories
          </p>
        </div>
      </div>
    </div>
  );
}
