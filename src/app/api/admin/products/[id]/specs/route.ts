import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["SPEC", "WARRANTY", "MFG"] as const;
const row = z.object({ group: z.string().min(1), label: z.string().min(1), value: z.string().min(1) });
const payload = z.object({ kind: z.enum(KINDS).default("SPEC"), specs: z.array(row) });

async function guard() {
  const actor = await getActor();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard(); if (denied) return denied;
  const { id } = await ctx.params;
  const specs = await prisma.productSpecification.findMany({
    where: { productId: id }, orderBy: [{ kind: "asc" }, { group: "asc" }, { label: "asc" }] });
  return NextResponse.json({ specs });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard(); if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = payload.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  const { kind, specs } = parsed.data;

  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const saved = await prisma.$transaction(async (tx) => {
    await tx.productSpecification.deleteMany({ where: { productId: id, kind } });
    await tx.productSpecification.createMany({ data: specs.map((s) => ({ ...s, productId: id, kind })) });
    return tx.productSpecification.findMany({ where: { productId: id, kind }, orderBy: [{ group: "asc" }, { label: "asc" }] });
  });
  return NextResponse.json({ specs: saved });
}