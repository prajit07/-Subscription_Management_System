import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const taxes = await prisma.tax.findMany({ orderBy: { id: "desc" } });
  return NextResponse.json(taxes);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, rate } = await req.json();
  const tax = await prisma.tax.create({
    data: { name, rate: parseFloat(rate) || 0 },
  });
  return NextResponse.json(tax);
}
