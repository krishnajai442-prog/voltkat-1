import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/guards";
import { isStaffRole } from "@/lib/auth/session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const actor = await getActor();
  if (actor && isStaffRole(actor.role)) redirect("/admin/dashboard");

  return <AdminLoginForm />;
}