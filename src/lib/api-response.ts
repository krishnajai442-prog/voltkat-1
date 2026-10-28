import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      ok: false,
      error: error.issues[0]?.message ?? "Invalid input",
      fields: error.flatten().fieldErrors,
    },
    { status: 422 },
  );
}

export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}