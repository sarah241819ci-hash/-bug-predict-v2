import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch past analyses
  const analyses = await prisma.analysis.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: "desc" },
    include: { files: true },
    take: 10,
  });

  // Calculate metrics
  const totalScans = analyses.length;
  const criticalRisks = analyses.filter(a => a.risk_level === "HIGH").length;
  const avgComplexity = totalScans > 0 
    ? (analyses.reduce((acc, curr) => acc + curr.overall_risk, 0) / totalScans).toFixed(2) 
    : "0.0";

  // Format data for Recharts
  // 1. Risk by Component (using repo names for now)
  const riskData = analyses.map(a => ({
    name: a.repository_name.split("/").pop() || "Unknown",
    risk: Math.round(a.overall_risk * 100),
  })).slice(0, 5);

  // 2. Health Data
  const highCount = criticalRisks;
  const mediumCount = analyses.filter(a => a.risk_level === "MEDIUM").length;
  const lowCount = totalScans - highCount - mediumCount;
  
  const healthData = [
    { name: "Healthy", value: lowCount || 0 },
    { name: "Monitor", value: mediumCount || 0 },
    { name: "At Risk", value: highCount || 0 },
  ];

  // Most recent files
  const recentFiles = analyses.flatMap(a => a.files.map(f => ({
    ...f,
    repo: a.repository_name,
    analysisId: a.id
  }))).sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);

  return (
    <DashboardClient 
      totalScans={totalScans}
      criticalRisks={criticalRisks}
      avgComplexity={avgComplexity}
      riskData={riskData.length > 0 ? riskData : []}
      healthData={healthData}
      recentFiles={recentFiles}
    />
  );
}
