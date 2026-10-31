import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const templates = await prisma.quotationTemplate.findMany({
    include: { plan: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const template = await prisma.quotationTemplate.create({
    data: {
      name: body.name,
      planId: body.planId ? parseInt(body.planId) : null,
      validityDays: parseInt(body.validityDays) || 30,
      linesJson: body.linesJson || "[]",
    },
  });
  return NextResponse.json(template);
}
