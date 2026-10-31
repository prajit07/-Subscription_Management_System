import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, priceExtra } = await req.json();
  const variant = await prisma.productVariant.create({
    data: {
      productId: parseInt(id),
      name,
      priceExtra: parseFloat(priceExtra) || 0,
    },
  });
  return NextResponse.json(variant);
}
