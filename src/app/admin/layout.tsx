import type { Metadata } from "next";
import { getActor } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin Console",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();

  return (
    <AdminShell
      user={
        actor
          ? { name: actor.name, email: actor.email, role: actor.role }
          : null
      }
    >
      {children}
    </AdminShell>
  );
}