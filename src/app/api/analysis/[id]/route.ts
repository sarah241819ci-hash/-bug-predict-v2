import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: { files: true },
  });

  if (!analysis || analysis.user_id !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: analysis.id,
    repository_name: analysis.repository_name,
    repository_url: analysis.repository_url,
    overall_risk: analysis.overall_risk,
    risk_level: analysis.risk_level,
    created_at: analysis.created_at,
    file_count: analysis.files.length,
    high_count: analysis.files.filter((f) => f.risk_level === "HIGH").length,
    med_count: analysis.files.filter((f) => f.risk_level === "MEDIUM").length,
    low_count: analysis.files.filter((f) => f.risk_level === "LOW").length,
  });
}
