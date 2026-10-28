import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { parseProductOptions } from "@/lib/product-options";

const CAN_EDIT = ["ADMIN", "MANAGER", "STAFF"];
const roleOf = (actor: unknown): string => (actor as { role?: string } | null)?.role ?? "";

export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor || !CAN_EDIT.includes(roleOf(actor))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const row: any = await prisma.product.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const names: string[] = Array.isArray(row.colors) ? row.colors : [];
    const rich: any[] = Array.isArray(row.colorOptions)
      ? row.colorOptions
      : names.map((n) => ({ name: n, image: "" }));
    return NextResponse.json({
      product: {
        id: row.id,
        name: row.name,
        colors: names,
        colorOptions: rich,
        variants: Array.isArray(row.variants) ? row.variants : [],
        optionGroups: Array.isArray(row.optionGroups) ? row.optionGroups : [],
      },
    });
  }

  const products = await prisma.product.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ products });
}

export async function PATCH(req: NextRequest) {
  const actor = await getActor();
  if (!actor || !CAN_EDIT.includes(roleOf(actor))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const id = (body as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  }

  const data = parseProductOptions(body);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await prisma.product.update({ where: { id }, data });
  return NextResponse.json({ ok: true, id });
}