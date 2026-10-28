import "server-only";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/utils";
import { getSessionToken, isStaffRole, verifySession, type SessionUser } from "./session";

export { isStaffRole };
export type { SessionUser };

export async function getActor(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  const session = await verifySession(token);
  if (!session?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      whatsappOptIn: true,
      active: true,
      avatarUrl: true,
    },
  });

  if (!user || !user.active) return null;
  return user;
}

export async function requireActor(opts: { redirectOnError?: boolean } = {}): Promise<SessionUser> {
  const actor = await getActor();

  if (!actor) {
    if (opts.redirectOnError) redirect("/auth/login");
    throw new AppError(401, "Sign in required.", "UNAUTHENTICATED");
  }

  return actor;
}

export async function requireStaff(opts: { redirectOnError?: boolean } = {}): Promise<SessionUser> {
  const actor = await requireActor(opts);

  if (!isStaffRole(actor.role)) {
    if (opts.redirectOnError) redirect("/forbidden");
    throw new AppError(403, "Access denied.", "FORBIDDEN");
  }

  return actor;
}

export async function requireAdmin(opts: { redirectOnError?: boolean } = {}): Promise<SessionUser> {
  const actor = await requireStaff(opts);

  if (actor.role !== "ADMIN") {
    if (opts.redirectOnError) redirect("/forbidden");
    throw new AppError(403, "Admin access required.", "FORBIDDEN");
  }

  return actor;
}

export const can = {
  manageCatalog: (role: string) => role === "ADMIN" || role === "MANAGER",
  manageOrders: (role: string) => isStaffRole(role),
  manageCustomers: (role: string) => role === "ADMIN" || role === "MANAGER",
  manageContent: (role: string) => role === "ADMIN" || role === "MANAGER",
  support: (role: string) => isStaffRole(role),
  destroy: (role: string) => role === "ADMIN",
  refund: (role: string) => role === "ADMIN",
};

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  } catch {
    return { error: "Unserializable value" } as Prisma.InputJsonValue;
  }
}

export async function audit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: toJson(input.before) ?? undefined,
        after: toJson(input.after) ?? undefined,
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
      },
    });
  } catch (e) {
    console.error("[audit]", e);
  }
}