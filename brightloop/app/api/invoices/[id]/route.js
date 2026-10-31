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
  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(id) },
    include: { customer: true, subscription: true, lines: true, payments: true },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();

  // state change (confirm/cancel)
  if (body.action === "confirm") {
    const inv = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { state: "confirmed" },
    });
    return NextResponse.json(inv);
  }

  if (body.action === "cancel") {
    const inv = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { state: "cancelled" },
    });
    return NextResponse.json(inv);
  }

  // record payment
  if (body.action === "pay") {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: { payments: true },
    });
    const amt = parseFloat(body.amount) > 0 ? parseFloat(body.amount) : invoice.total;
    await prisma.payment.create({
      data: {
        invoiceId: parseInt(id),
        method: body.method || "cash",
        amount: amt,
        note: body.note || "",
        date: new Date(),
      },
    });
    const paidSum = invoice.payments.reduce((s, p) => s + p.amount, 0) + amt;
    if (paidSum >= invoice.total - 0.001) {
      await prisma.invoice.update({
        where: { id: parseInt(id) },
        data: { state: "paid" },
      });
    }
    const updated = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true, subscription: true, lines: true, payments: true },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
