import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/guards";
import { ProfileClient } from "@/components/account/ProfileClient";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const actor = await getActor();
  if (!actor) redirect("/auth/login?next=/account/profile");

  const user = await getActor();

  return (
    <ProfileClient
      initial={{
        name: user?.name ?? actor.name,
        email: user?.email ?? actor.email,
        phone: user?.phone ?? null,
        whatsappOptIn: user?.whatsappOptIn ?? false,
        marketingOptIn: (user as { marketingOptIn?: boolean })?.marketingOptIn ?? false,
      }}
    />
  );
}