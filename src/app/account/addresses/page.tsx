import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { AddressesClient } from "@/components/account/AddressesClient";

export const dynamic = "force-dynamic";

export default async function AccountAddressesPage() {
  const actor = await getActor();
  if (!actor) redirect("/auth/login?next=/account/addresses");

  const addresses = await prisma.address.findMany({
    where: { userId: actor.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <AddressesClient
      initial={addresses.map((a) => ({
        id: a.id,
        label: a.label,
        fullName: a.fullName,
        phone: a.phone,
        altPhone: a.altPhone,
        pincode: a.pincode,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        state: a.state,
        isDefault: a.isDefault,
      }))}
    />
  );
}