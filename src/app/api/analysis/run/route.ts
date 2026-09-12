import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";


export const maxDuration = 300; // Allow up to 5 minutes for analysis

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // In development: call local FastAPI server
    // In production: Use NEXT_PUBLIC_APP_URL to avoid Vercel's internal deployment protection (401 errors).
    // Fallback to VERCEL_PROJECT_PRODUCTION_URL if available.
    let baseAppUrl = "http://localhost:3000";
    if (process.env.NEXT_PUBLIC_APP_URL) {
      baseAppUrl = process.env.NEXT_PUBLIC_APP_URL.startsWith("http") 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : `https://${process.env.NEXT_PUBLIC_APP_URL}`;
    } else if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
      baseAppUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
      baseAppUrl = `https://${process.env.VERCEL_URL}`;
    }

    const pythonUrl =
      process.env.NODE_ENV === "development"
        ? "http://127.0.0.1:5328/api/python/analyze"
        : `${baseAppUrl}/api/python/analyze`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240_000); // 4 min timeout

    let pyResp: Response;
    try {
      pyResp = await fetch(pythonUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.AUTH_SECRET}`
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!pyResp.ok) {
      const errorText = await pyResp.text();
      return NextResponse.json(
        { error: `Analysis Engine Error: ${errorText}` },
        { status: 500 }
      );
    }

    const data = await pyResp.json();
    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    // Save to Database
    const analysis = await prisma.analysis.create({
      data: {
        user_id: session.user.id,
        repository_url: data.repository_url,
        repository_name: data.repository_name,
        overall_risk: data.overall_risk,
        risk_level: data.risk_level,
        files: {
          create: data.files.map((f: any) => ({
            file_path: f.file_path,
            risk_score: f.risk_score,
            risk_level: f.risk_level,
            metrics: f.metrics,
            ai_explanation: f.ai_explanation,
            test_suggestions: f.test_suggestions,
          })),
        },
      },
    });

    return NextResponse.json({ analysisId: analysis.id }, { status: 200 });
  } catch (error: any) {
    console.error("Analysis Runner Error:", error);
    if (error.name === "AbortError") {
      return NextResponse.json(
        { error: "Analysis timed out. The repository may be too large. Try again." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
