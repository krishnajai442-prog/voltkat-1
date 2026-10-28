"use client";

import { Heart, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

export function MobileTabBar() {
  const pathname = usePathname();
  const { items, authed, ready } = useCart();

  const cartCount = ready && Array.isArray(items)
    ? items.filter((i) => !i.savedForLater).reduce((s, i) => s + i.quantity, 0)
    : 0;

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/products/all", label: "Shop", icon: LayoutGrid },
    { href: "/account/wishlist", label: "Wishlist", icon: Heart },
    { href: "/cart", label: "Cart", icon: ShoppingBag, badge: cartCount },
    { href: authed ? "/account" : "/auth/login", label: "Account", icon: User },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/95 backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          const Icon = l.icon;

          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] font-bold transition-colors",
                active ? "text-electric-600" : "text-ink-400",
              )}
            >
              <Icon className="size-5" />
              {l.label}

              {"badge" in l && typeof l.badge === "number" && l.badge > 0 && (
                <span className="absolute right-[22%] top-1.5 grid size-4 place-items-center rounded-full bg-electric-500 text-[9px] font-bold text-white">
                  {l.badge > 9 ? "9+" : l.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}