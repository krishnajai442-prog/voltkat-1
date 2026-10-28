"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  ExternalLink,
  FileText,
  Gift,
  Heart,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type User = { name: string; email: string; role: string } | null;

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Gift },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/slides", label: "Hero Slides", icon: SlidersHorizontal },
  { href: "/admin/features", label: "Homepage Features", icon: Settings2 },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isLogin = pathname.startsWith("/admin/login");

  useEffect(() => {
    if (!isLogin && !user) {
      router.replace("/admin/login");
    }
  }, [isLogin, user, router]);

  useEffect(() => setOpen(false), [pathname]);

  if (isLogin) {
    return <div className="min-h-dvh bg-canvas">{children}</div>;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Mobile topbar */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/95 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
            className="grid size-9 place-items-center rounded-xl text-ink-700 hover:bg-canvas"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-display text-sm font-bold text-ink-900">
            VoltKart Admin
          </span>
          <Link
            href="/"
            className="grid size-9 place-items-center rounded-xl text-ink-400 hover:bg-canvas"
            aria-label="View storefront"
          >
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-ink-950/55"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[84vw] max-w-xs overflow-y-auto bg-ink-900 p-4 text-white">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-base font-bold">Admin</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-xl bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
            <AdminNav vertical />
          </aside>
        </div>
      )}

      <div className="md:grid md:grid-cols-[16rem_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-hairline bg-ink-900 p-4 text-white md:sticky md:top-0 md:h-dvh md:overflow-y-auto md:block">
          <Link href="/admin/dashboard" className="mb-6 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-electric-500 to-violet-accent">
              <Package className="size-4" />
            </span>
            <span>
              <span className="block font-display text-sm font-bold">VoltKart</span>
              <span className="block text-[11px] text-white/45">Admin Console</span>
            </span>
          </Link>

          <AdminNav vertical />

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-white/35">
              Signed in
            </p>
            <p className="mt-1 truncate px-3 text-[13px] font-semibold">{user?.name}</p>
            <p className="truncate px-3 text-[11.5px] text-white/45">{user?.email}</p>
            <div className="mt-3 space-y-1 px-1">
              <Link
                href="/account/notifications"
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Bell className="size-4" /> Notifications
              </Link>
              <Link
                href="/"
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="size-4" /> View store
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-flame-500 hover:bg-flame-500/10"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function AdminNav({ vertical }: { vertical?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className={cn(vertical ? "space-y-1" : "flex gap-1 overflow-x-auto")}
    >
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
              active
                ? "bg-white text-ink-900 shadow-soft"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}