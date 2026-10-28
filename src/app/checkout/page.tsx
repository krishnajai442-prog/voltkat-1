import type { Metadata } from "next";
import Script from "next/script";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { CheckoutWizard } from "@/components/checkout/CheckoutWizard";
import { publicKeyId, razorpayConfigured } from "@/lib/razorpay";

export const metadata: Metadata = {
  title: "Secure Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const actor = await getActor();

  let addresses: Awaited<ReturnType<typeof prisma.address.findMany>> = [];
  let pin: string | undefined;

  if (actor) {
    const rows = await prisma.address.findMany({
      where: { userId: actor.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    addresses = rows;
    pin = rows.find((r) => r.isDefault)?.pincode ?? rows[0]?.pincode;
  }

  const rzpKey = publicKeyId();

  return (
    <div className="container-x py-6">
      {rzpKey && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
      )}

        <div className="sr-only">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">Checkout</h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            Prices, coupons and stock are re-validated on our server at every step.
          </p>
        </div>
        <span className="rounded-full bg-mint-500/10 px-3 py-1.5 text-[11.5px] font-bold text-emerald-700">
          🔒 Secured session · {razorpayConfigured ? "Razorpay live" : "Sandbox mode"}
        </span>
      </div>

      <CheckoutWizard
        addresses={addresses.map((a) => ({
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
        defaultPincode={pin}
        razorpayKey={rzpKey}
      />
    </div>
  );
}