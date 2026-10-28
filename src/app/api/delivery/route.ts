import { NextResponse } from "next/server";
import { inspectPincode } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let pincode: unknown;
  try {
    const body = (await req.json()) as { pincode?: unknown };
    pincode = body.pincode;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (typeof pincode !== "string" || pincode.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "pincode is required." }, { status: 400 });
  }

  try {
    const result = await inspectPincode(pincode); // <- now awaited
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not check serviceability. Try again." },
      { status: 500 },
    );
  }
}