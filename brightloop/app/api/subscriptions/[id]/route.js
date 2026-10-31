import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const sub = await prisma.subscription.findUnique({
    where: { id: parseInt(id) },
    include: {
      customer: true,
      plan: true,
      lines: true,
      invoices: { include: { customer: true }, orderBy: { id: "desc" } },
    },
  });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sub);
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const data = {};
  if (body.state) data.state = body.state;
  if (body.closeReason) data.closeReason = body.closeReason;

  const sub = await prisma.subscription.update({
    where: { id: parseInt(id) },
    data,
  });
  return NextResponse.json(sub);
}
