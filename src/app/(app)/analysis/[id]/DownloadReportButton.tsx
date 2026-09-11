"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function DownloadReportButton({ analysis }: { analysis: any }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      
      // Branding / Header
      doc.setFontSize(24);
      doc.setTextColor(67, 56, 202); // Indigo-700
      doc.text("Bug Predict", 14, 20);
      
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text("Project Risk Report", 14, 30);
      
      // Basic Info
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Repository: ${analysis.repository_name}`, 14, 40);
      doc.text(`Date Analyzed: ${new Date(analysis.created_at).toLocaleString()}`, 14, 46);
      doc.text(`Total Files Scanned: ${analysis.files.length}`, 14, 52);

      // Overall Score
      const riskPct = Math.round(analysis.overall_risk * 100);
      const health = Math.round((1 - analysis.overall_risk) * 100);
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Executive Summary", 14, 65);
      
      // Risk Metrics Table
      autoTable(doc, {
        startY: 70,
        head: [['Metric', 'Value', 'Status']],
        body: [
          ['Overall Risk Score', `${riskPct}%`, analysis.risk_level],
          ['Project Health', `${health}%`, health >= 70 ? 'Healthy' : health >= 40 ? 'Moderate' : 'At Risk'],
          ['High Risk Files', analysis.files.filter((f: any) => f.risk_level === 'HIGH').length.toString(), 'Requires Attention'],
          ['Medium Risk Files', analysis.files.filter((f: any) => f.risk_level === 'MEDIUM').length.toString(), 'Monitor'],
          ['Low Risk Files', analysis.files.filter((f: any) => f.risk_level === 'LOW').length.toString(), 'Stable'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [67, 56, 202] },
      });

      // High Priority Action Items
      let finalY = (doc as any).lastAutoTable.finalY || 130;
      doc.setFontSize(14);
      doc.text("Fix These First (Highest Risk Files)", 14, finalY + 15);
      
      const highRiskFiles = analysis.files.filter((f: any) => f.risk_level === 'HIGH');
      if (highRiskFiles.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("No high-risk files detected. The repository appears healthy.", 14, finalY + 25);
        finalY += 30;
      } else {
        const aiBody = highRiskFiles.map((f: any) => [
          f.file_path,
          `${Math.round(f.risk_score * 100)}%`,
          f.ai_explanation || "No AI explanation available.",
          f.test_suggestions || "Review and refactor code."
        ]);
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['File Path', 'Defect Probability', 'Why It Is Risky (Gemini AI)', 'Recommended Action']],
          body: aiBody,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 15 },
            2: { cellWidth: 65 },
            3: { cellWidth: 60 },
          },
          headStyles: { fillColor: [239, 68, 68] },
        });
        finalY = (doc as any).lastAutoTable.finalY;
      }

      // Technical Details
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Technical Details", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "This analysis was performed using an XGBoost Machine Learning model trained on the Kaggle Software Defect Prediction dataset. The risk scores are raw defect probabilities.",
        14, 28, { maxWidth: 180 }
      );

      const allFilesBody = analysis.files.map((f: any) => {
        const metrics = f.metrics as any;
        return [
          f.file_path,
          f.risk_level,
          `${Math.round(f.risk_score * 100)}%`,
          metrics?.loc?.toString() || '0',
          metrics?.cyclomatic_complexity !== undefined ? (Math.round(metrics.cyclomatic_complexity * 10) / 10).toString() : '0',
          metrics?.commit_count?.toString() || '0'
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [['File Path', 'Risk Level', 'XGBoost Score', 'LOC', 'Complexity', 'Commits']],
        body: allFilesBody,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 85, 105] },
      });

      // Disclaimer Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          "Disclaimer: This report predicts potential defect risk based on historical metrics. It does NOT confirm the existence of actual bugs.",
          14,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 25,
          doc.internal.pageSize.height - 10
        );
      }
      
      const safeRepoName = analysis.repository_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`Bug-Predict-Project-Risk-Report-${safeRepoName}-${dateStr}.pdf`);
      
    } catch (error) {
      console.error("PDF Generation failed", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm flex-shrink-0"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Download Risk Report
    </button>
  );
}
