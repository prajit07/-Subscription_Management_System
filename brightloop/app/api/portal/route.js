import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const subs = await prisma.subscription.findMany({
    where: { customerId: userId },
    include: { plan: true },
    orderBy: { id: "desc" },
  });
  const invoices = await prisma.invoice.findMany({
    where: { customerId: userId },
    orderBy: { id: "desc" },
  });
  return NextResponse.json({ subs, invoices });
}
