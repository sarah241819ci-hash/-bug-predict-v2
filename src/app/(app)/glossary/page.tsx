import { BookOpen } from "lucide-react";

const GLOSSARY = [
  {
    term: "Risk Score",
    def: "A 0–100% probability that a file contains or will introduce a defect. This score is generated purely by our trained XGBoost Machine Learning model based on the Kaggle Software Defect Prediction Dataset features.",
  },
  {
    term: "Low, Medium, High Risk",
    def: "Risk score thresholds: Low (< 40%), Medium (40% - 70%), and High (> 70%). High risk areas should be prioritized for review and refactoring.",
  },
  {
    term: "Lines of Code (LOC)",
    def: "The total number of code lines in a file. Larger files are statistically harder to maintain and test, making them more prone to defects.",
  },
  {
    term: "Cyclomatic Complexity",
    def: "A measure of the number of linearly independent paths through a program's source code (e.g., if/else blocks, loops). Higher scores indicate convoluted logic that is difficult to test.",
  },
  {
    term: "Functions",
    def: "The number of individual functions or methods defined in a file.",
  },
  {
    term: "Classes",
    def: "The number of classes defined in an object-oriented file. Too many classes in one file can indicate a violation of the single-responsibility principle.",
  },
  {
    term: "Code Churn",
    def: "The frequency and volume at which a file's code is modified over time. High churn files accumulate risk from repeated, layered edits.",
  },
  {
    term: "Commits",
    def: "The total number of git commits that have modified this file historically.",
  },
  {
    term: "Contributors",
    def: "The number of unique authors who have edited the file. A high contributor count can sometimes lead to inconsistent patterns and ownership gaps.",
  },
  {
    term: "Changed Lines",
    def: "The cumulative sum of line additions and deletions over the file's lifetime.",
  },
  {
    term: "File Age",
    def: "The time elapsed since the file was first created. Extremely old files with high churn often represent legacy technical debt.",
  },
  {
    term: "Static Analysis Warnings",
    def: "Issues flagged by standard linters or static analysis tools before the ML model is even applied.",
  },
  {
    term: "Maintainability",
    def: "An index representing how easy a codebase is to modify safely. Lower complexity, smaller files, and good test coverage yield higher maintainability.",
  },
  {
    term: "Defect Probability",
    def: "The raw probability float (0.0 to 1.0) output directly from the XGBoost classifier before being scaled to a Risk Score.",
  },
];

export default function GlossaryPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
          <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metrics Glossary</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Understand the technical terms and machine learning metrics used in our defect prediction model.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GLOSSARY.map((g) => (
          <div key={g.term} className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-2">{g.term}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {g.def}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
