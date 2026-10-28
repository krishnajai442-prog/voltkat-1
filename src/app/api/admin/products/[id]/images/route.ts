import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const img = z.object({ url: z.string().min(1), alt: z.string().default(""), position: z.number().int().default(0) });
const payload = z.object({ kind: z.enum(["GALLERY", "SHOWCASE"]).default("GALLERY"), images: z.array(img) });

async function guard() {
  const actor = await getActor();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard(); if (denied) return denied;
  const { id } = await ctx.params;
  const images = await prisma.productImage.findMany({ where: { productId: id }, orderBy: { position: "asc" } });
  return NextResponse.json({ images });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard(); if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = payload.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  const { kind, images } = parsed.data;

  const saved = await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId: id, kind } });
    await tx.productImage.createMany({ data: images.map((m, i) => ({ ...m, position: m.position || i, productId: id, kind })) });
    return tx.productImage.findMany({ where: { productId: id, kind }, orderBy: { position: "asc" } });
  });
  return NextResponse.json({ images: saved });
}