import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff, can } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await requireStaff();
  if (!actor || !can.manageCatalog(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, categories: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  return NextResponse.json({ brands, categories: categories.map((c) => c.name) });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireStaff();
  if (!actor || !can.manageCatalog(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; categories?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const categories = Array.isArray(body.categories) ? body.categories.filter((c): c is string => typeof c === "string") : [];
  const brand = await prisma.brand.update({ where: { id: body.id }, data: { categories } });
  return NextResponse.json({ ok: true, brand });
}