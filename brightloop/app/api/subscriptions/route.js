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
  const subs = await prisma.subscription.findMany({
    where,
    include: { customer: true, plan: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(subs);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  // generate number
  const last = await prisma.subscription.findFirst({ orderBy: { id: "desc" } });
  const nextNum = (last?.id || 0) + 1;
  const number = `SUB-${String(nextNum).padStart(5, "0")}`;

  const plan = body.planId
    ? await prisma.recurringPlan.findUnique({ where: { id: parseInt(body.planId) } })
    : null;

  const sub = await prisma.subscription.create({
    data: {
      number,
      customerId: parseInt(body.customerId),
      planId: body.planId ? parseInt(body.planId) : null,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      paymentTerms: body.paymentTerms || "",
      state: "draft",
      recurringPrice: plan?.price || 0,
      nextInvoiceDate: body.startDate ? new Date(body.startDate) : new Date(),
    },
  });

  // create lines
  const lines = body.lines || [];
  for (const l of lines) {
    await prisma.subscriptionLine.create({
      data: {
        subscriptionId: sub.id,
        productId: l.productId ? parseInt(l.productId) : null,
        variantId: l.variantId ? parseInt(l.variantId) : null,
        qty: parseFloat(l.qty) || 1,
        unitPrice: parseFloat(l.unitPrice) || 0,
        taxId: l.taxId ? parseInt(l.taxId) : null,
        amount: (parseFloat(l.qty) || 1) * (parseFloat(l.unitPrice) || 0),
      },
    });
  }

  return NextResponse.json(sub);
}
