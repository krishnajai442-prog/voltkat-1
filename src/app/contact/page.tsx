import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact VoltKart",
  description: "Reach VoltKart support for orders, products, payments, returns and partnerships.",
  alternates: { canonical: siteUrl("/contact") },
};

export default function ContactPage() {
  return (
    <div className="container-x py-8">
      <SectionHeading
        eyebrow="Support"
        title="Contact VoltKart"
        subtitle="Product advice, order issues, payment help, returns and partnership enquiries."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_22rem]">
        <ContactForm />

        <aside className="space-y-3">
          <InfoCard icon={<Phone className="size-4" />} title="Call us" body="1800-120-4567" hint="Mon–Sat, 9 AM to 8 PM IST" />
          <InfoCard icon={<Mail className="size-4" />} title="Email" body="support@voltkart.in" hint="Replies within 24 working hours" />
          <InfoCard icon={<MapPin className="size-4" />} title=" Offices" body="Bengaluru • Mumbai • Delhi NCR" hint="Fulfilment and support hubs" />
          <InfoCard icon={<Clock className="size-4" />} title="Order tracking" body="Use your order number + email/mobile" hint="/track" />
        </aside>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  body,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-electric-600">
        {icon}
        <p className="text-[12px] font-bold uppercase tracking-wider">{title}</p>
      </div>
      <p className="mt-2 text-[14px] font-bold text-ink-900">{body}</p>
      {hint && <p className="mt-1 text-[12.5px] text-ink-400">{hint}</p>}
    </div>
  );
}