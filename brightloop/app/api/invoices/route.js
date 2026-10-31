import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");
  const where = state ? { state } : {};
  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: true, subscription: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(invoices);
}
