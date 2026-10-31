import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "staff"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await prisma.user.findMany({ orderBy: { id: "desc" } });
  return NextResponse.json(users.map(u => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
  })));
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { email, fullName, password } = await req.json();
  const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;
  if (!pwRegex.test(password)) {
    return NextResponse.json({ error: "Weak password" }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email exists" }, { status: 400 });
  }
  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: { email, fullName, passwordHash, role: "staff" },
  });
  return NextResponse.json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
}
