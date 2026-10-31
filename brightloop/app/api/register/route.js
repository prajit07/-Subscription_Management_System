import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    const { fullName, email, password } = await req.json();

    // validate password
    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;
    if (!pwRegex.test(password)) {
      return NextResponse.json(
        { error: "Password must be 9+ chars with upper, lower, and special character" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);
    await prisma.user.create({
      data: { email, fullName, passwordHash, role: "customer" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
