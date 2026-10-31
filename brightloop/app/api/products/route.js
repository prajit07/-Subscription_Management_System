import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireRole(roles) {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (roles && !roles.includes(session.user.role)) return null;
  return session.user;
}

export async function GET() {
  const user = await requireRole(["admin", "staff"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(req) {
  const user = await requireRole(["admin", "staff"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, ptype, salesPrice, costPrice, notes } = await req.json();
  const product = await prisma.product.create({
    data: {
      name,
      ptype: ptype || "software",
      salesPrice: parseFloat(salesPrice) || 0,
      costPrice: parseFloat(costPrice) || 0,
      notes: notes || "",
    },
  });
  return NextResponse.json(product);
}
