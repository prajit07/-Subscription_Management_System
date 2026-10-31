import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const discounts = await prisma.discount.findMany({
    include: { product: true, subscription: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(discounts);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const discount = await prisma.discount.create({
    data: {
      name: body.name,
      dtype: body.dtype || "percentage",
      value: parseFloat(body.value) || 0,
      minQty: parseInt(body.minQty) || 0,
      minPurchase: parseFloat(body.minPurchase) || 0,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      usageLimit: parseInt(body.usageLimit) || 0,
      appliesTo: body.appliesTo || "all",
      productId: body.productId ? parseInt(body.productId) : null,
      subscriptionId: body.subscriptionId ? parseInt(body.subscriptionId) : null,
    },
  });
  return NextResponse.json(discount);
}
