import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [activeSubs, totalSubs, products, customers, invoices] = await Promise.all([
    prisma.subscription.count({ where: { state: "active" } }),
    prisma.subscription.count(),
    prisma.product.count(),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.invoice.findMany({ include: { customer: true } }),
  ]);

  const totalRevenue = invoices
    .filter(i => ["confirmed", "paid"].includes(i.state))
    .reduce((s, i) => s + i.total, 0);
  const paid = invoices
    .filter(i => i.state === "paid")
    .reduce((s, i) => s + i.total, 0);
  const outstanding = invoices
    .filter(i => ["draft", "confirmed"].includes(i.state))
    .reduce((s, i) => s + i.total, 0);
  const now = new Date();
  const overdueCount = invoices.filter(i => {
    if (i.state !== "confirmed") return false;
    const diff = (now - new Date(i.date)) / (1000 * 60 * 60 * 24);
    return diff > 30;
  }).length;

  const recentInvoices = invoices
    .sort((a, b) => b.id - a.id)
    .slice(0, 10)
    .map(i => ({
      id: i.id,
      number: i.number,
      customerName: i.customer?.fullName || "",
      date: i.date,
      total: i.total,
      state: i.state,
    }));

  return NextResponse.json({
    activeSubs,
    totalSubs,
    products,
    customers,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    outstanding: Math.round(outstanding * 100) / 100,
    overdueCount,
    recentInvoices,
  });
}
