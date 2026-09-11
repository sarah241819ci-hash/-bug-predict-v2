"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ShieldAlert, Activity, GitCommit, ArrowRight } from "lucide-react";
import Link from "next/link";

const COLORS = ['#10B981', '#F59E0B', '#EF4444']; // Green, Yellow, Red

export default function DashboardClient({ 
  totalScans, criticalRisks, avgComplexity, riskData, healthData, recentFiles 
}: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Your portfolio at a glance</p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center space-x-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Critical Risks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{criticalRisks}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Complexity</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgComplexity}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
            <GitCommit className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Scans</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalScans}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk by Component</h3>
          <div className="h-60">
            {riskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.05)'}} 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Bar dataKey="risk" radius={[4, 4, 0, 0]}>
                    {riskData.map((entry: any, index: number) => {
                      const color = entry.risk >= 70 ? '#EF4444' : entry.risk >= 40 ? '#F59E0B' : '#10B981'; // Red, Yellow, Green
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">No data to display. Run an analysis!</div>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Health</h3>
          <div className="h-60">
            {totalScans > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {healthData.map((entry: any, index: number) => {
                      // Map health colors: Healthy=Green, Monitor=Yellow, At Risk=Red
                      const COLORS = ['#10B981', '#F59E0B', '#EF4444']; 
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">No data to display.</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent "At Risk" Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent At-Risk Files</h3>
          <Link href="/history" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center hover:underline">
            View All History <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-slate-700">
          {recentFiles.length > 0 ? recentFiles.map((file: any) => (
            <li key={file.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{file.file_path}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{file.repo}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                  file.risk_level === 'HIGH' ? 'bg-indigo-700 text-white dark:bg-indigo-900/50 dark:text-indigo-300' :
                  file.risk_level === 'MEDIUM' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
                }`}>
                  {Math.round(file.risk_score * 100)}% Risk
                </span>
                <Link href={`/analysis/${file.analysisId}`} className="text-gray-400 hover:text-indigo-600 transition-colors">
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </li>
          )) : (
            <li className="px-5 py-6 text-center text-gray-500 text-sm">No analysis history found.</li>
          )}
        </ul>
      </div>
    </div>
  );

}
