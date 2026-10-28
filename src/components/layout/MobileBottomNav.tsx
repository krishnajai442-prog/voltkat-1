"use client";

import { Home, LayoutGrid, User, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { items, ready } = useCart();
  
  const cartCount = ready && Array.isArray(items) ? items.filter(i => !i.savedForLater).reduce((s, i) => s + i.quantity, 0) : 0;

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/categories", label: "Categories", icon: LayoutGrid },
    { href: "/account", label: "Account", icon: User },
    { href: "/cart", label: "Cart", icon: ShoppingBag, badge: cartCount },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white md:hidden safe-area-bottom">
      <div className="grid grid-cols-4">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-[#2874f0]" : "text-gray-500"
              )}
            >
              <Icon className={cn("size-5", active && "fill-current")} strokeWidth={active ? 2.5 : 2} />
              <span>{link.label}</span>
              
              {"badge" in link && typeof link.badge === 'number' && link.badge > 0 && (
                <span className="absolute right-[25%] top-1 grid size-4 place-items-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {link.badge > 9 ? "9+" : link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}