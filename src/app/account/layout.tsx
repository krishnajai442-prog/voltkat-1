import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/guards";
import { AccountNav } from "@/components/account/AccountNav";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();

  if (!actor) {
    redirect("/auth/login?next=/account");
  }

  return (
    <div className="container-x py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
        <AccountNav role={actor.role} />
        <div className="min-w-0 max-w-full overflow-x-clip">{children}</div>
      </div>
    </div>
  );
}

