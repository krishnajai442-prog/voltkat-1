import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PINCODE_RE = /^[1-9]\d{5}$/;
export const MOBILE_RE = /^[6-9]\d{9}$/;

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function siteUrl(path = "/"): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath === "/" ? "" : cleanPath}`;
}

export function inr(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function paise(rupees: number): number {
  return Math.round(Number(rupees || 0) * 100);
}

export function savings(mrp: number, sale: number): number {
  return Math.max(0, Number(mrp || 0) - Number(sale || 0));
}

export function discountPercent(mrp: number, sale: number): number {
  const m = Number(mrp || 0);
  const s = Number(sale || 0);
  if (m <= 0 || s >= m) return 0;
  return Math.round(((m - s) / m) * 100);
}

export function gstComponent(gross: number, rate = 18): number {
  const g = Number(gross || 0);
  return Math.round(g - g / (1 + rate / 100));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sanitizeText(input: string, max = 2000): string {
  return String(input ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function excerpt(input: string, max = 160): string {
  const text = sanitizeText(input, max + 20);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function normalizeMobile(input: string | null | undefined): string | null {
  const raw = String(input ?? "").replace(/\D/g, "");
  if (!raw) return null;

  let digits = raw;
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);

  return MOBILE_RE.test(digits) ? digits : null;
}

export function toE164(input: string | null | undefined): string | null {
  const mobile = normalizeMobile(input);
  return mobile ? `91${mobile}` : null;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);

  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(d);
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function businessDays(from: Date | string, days: number): Date {
  let d = new Date(from);
  let added = 0;

  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }

  return d;
}

export function emiPlans(
  price: number,
): { months: number; perMonth: number; total: number }[] {
  const p = Number(price || 0);
  if (p < 2500) return [];

  const months = [3, 6, 9, 12];
  return months.map((m) => {
    const perMonth = Math.ceil(p / m);
    return {
      months: m,
      perMonth,
      total: perMonth * m,
    };
  });
}

export function reference(prefix = "VKREF"): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

export function orderNumber(): string {
  return `VK${Date.now().toString(36).toUpperCase().slice(-8)}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

export function trackingNumber(): string {
  return `VKTRK${Date.now().toString(36).toUpperCase().slice(-7)}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

export async function jsonError(error: unknown, fallback = "Something went wrong.") {
  const { NextResponse } = await import("next/server");

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown[] }).issues)
  ) {
    const issues = (error as { issues: { message?: string }[] }).issues;
    return NextResponse.json(
      {
        ok: false,
        error: issues[0]?.message ?? fallback,
      },
      { status: 422 },
    );
  }

  console.error("[jsonError]", error);

  return NextResponse.json(
    {
      ok: false,
      error: fallback,
    },
    { status: 500 },
  );
}