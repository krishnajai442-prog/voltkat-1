"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Package,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/profile", label: "Profile", icon: UserCog },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/support", label: "Support", icon: LifeBuoy },
];

export function AccountNav({ role }: { role: string }) {
  const pathname = usePathname();
  const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(role);

  return (
    <nav aria-label="Account navigation" className="card hidden p-2 lg:block lg:sticky lg:top-[92px]">
      <div className="no-scrollbar flex gap-1 overflow-x-auto p-1 lg:flex-col lg:overflow-visible">
        {links.map((l) => {
          const active = pathname === l.href;
          const Icon = l.icon;

          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors lg:w-full",
                active ? "bg-ink-900 text-white" : "text-ink-400 hover:bg-canvas hover:text-ink-900",
              )}
            >
              <Icon className="size-4" />
              {l.label}
            </Link>
          );
        })}

        {isStaff && (
          <Link
            href="/admin/dashboard"
            className="inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-violet-accent transition-colors hover:bg-violet-accent/8 lg:w-full"
          >
            <ShieldCheck className="size-4" />
            Admin console
          </Link>
        )}
      </div>
    </nav>
  );
}