import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeSubs = await prisma.subscription.findMany({
    where: { state: { in: ["active", "confirmed", "in_progress"] } },
    include: { plan: true },
  });

  let mrr = 0;
  for (const s of activeSubs) {
    const price = s.recurringPrice || (s.plan?.price || 0);
    const period = s.plan?.billingPeriod || "monthly";
    if (period === "yearly") mrr += price / 12;
    else if (period === "weekly") mrr += price * 4.33;
    else if (period === "daily") mrr += price * 30;
    else mrr += price;
  }

  const invoices = await prisma.invoice.findMany();
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter(i => i.state === "paid").reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter(i => ["draft", "confirmed"].includes(i.state)).reduce((s, i) => s + i.total, 0);
  const now = new Date();
  const overdue = invoices.filter(i => {
    if (i.state !== "confirmed") return false;
    return (now - new Date(i.date)) / 86400000 > 30;
  });

  return NextResponse.json({
    activeCount: activeSubs.length,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    totalInvoiced: Math.round(totalInvoiced * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    outstanding: Math.round(outstanding * 100) / 100,
    overdue,
  });
}
