import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function periodDelta(period) {
  const now = new Date();
  switch (period) {
    case "daily": return new Date(now.getTime() + 86400000);
    case "weekly": return new Date(now.getTime() + 7 * 86400000);
    case "yearly": return new Date(now.getTime() + 365 * 86400000);
    default: return new Date(now.getTime() + 30 * 86400000);
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const subs = await prisma.subscription.findMany({
    where: { state: "active" },
    include: {
      lines: true,
      plan: true,
    },
  });

  let created = 0;
  for (const sub of subs) {
    if (!sub.nextInvoiceDate || new Date(sub.nextInvoiceDate) > today) continue;

    // idempotency check
    const existing = await prisma.invoice.findFirst({
      where: { subscriptionId: sub.id, date: today },
    });
    if (existing) continue;

    // generate invoice number
    const lastInv = await prisma.invoice.findFirst({ orderBy: { id: "desc" } });
    const invNum = `INV-${String((lastInv?.id || 0) + 1).padStart(5, "0")}`;

    // compute lines
    let total = 0;
    let taxTotal = 0;
    const invoiceLines = [];

    for (const sl of sub.lines) {
      const unitPrice = sl.unitPrice;
      const amt = unitPrice * sl.qty;
      // simplified tax calc (would need tax lookup in production)
      invoiceLines.push({
        description: `Subscription line #${sl.id}`,
        qty: sl.qty,
        unitPrice,
        taxId: sl.taxId,
        taxAmount: 0,
        amount: amt,
      });
      total += amt;
    }

    const inv = await prisma.invoice.create({
      data: {
        number: invNum,
        subscriptionId: sub.id,
        customerId: sub.customerId,
        date: today,
        state: "draft",
        total,
        taxTotal,
        discountTotal: 0,
        lines: {
          create: invoiceLines.map(l => ({
            description: l.description,
            qty: l.qty,
            unitPrice: l.unitPrice,
            taxId: l.taxId,
            taxAmount: l.taxAmount,
            amount: l.amount,
          })),
        },
      },
    });

    // advance next invoice date
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        lastInvoiceDate: today,
        nextInvoiceDate: periodDelta(sub.plan?.billingPeriod || "monthly"),
      },
    });

    created++;
  }

  return NextResponse.json({ created });
}
