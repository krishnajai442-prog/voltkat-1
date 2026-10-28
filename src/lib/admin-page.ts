import { requireAdmin, requireStaff } from "./auth/guards";

export async function adminPage(opts: { admin?: boolean } = {}) {
  return opts.admin
    ? requireAdmin({ redirectOnError: true })
    : requireStaff({ redirectOnError: true });
}