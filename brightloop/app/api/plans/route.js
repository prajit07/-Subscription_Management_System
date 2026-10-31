import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plans = await prisma.recurringPlan.findMany({
    include: { product: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(plans);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const plan = await prisma.recurringPlan.create({
    data: {
      name: body.name,
      productId: body.productId ? parseInt(body.productId) : null,
      price: parseFloat(body.price) || 0,
      billingPeriod: body.billingPeriod || "monthly",
      minQty: parseInt(body.minQty) || 1,
      autoClose: !!body.autoClose,
      closable: body.closable !== false,
      pausable: !!body.pausable,
      renewable: body.renewable !== false,
    },
  });
  return NextResponse.json(plan);
}
