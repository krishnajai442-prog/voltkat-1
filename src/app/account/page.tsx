import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronRight,
  Headphones,
  Heart,
  MapPin,
  Package,
  Phone,
  Sparkles,
  Store,
  Ticket,
  UserRound,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { LogoutButton } from "@/components/account/LogoutButton";
import { AccountRecentlyViewed } from "@/components/account/AccountRecentlyViewed";
import { AccountSponsoredCard } from "@/components/account/AccountSponsoredCard";

type Row = { href: string; icon: LucideIcon; label: string; sub?: string };

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-black uppercase tracking-wider text-gray-500">{title}</h2>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border bg-white shadow-sm">
        {rows.map((r) => (
          <Link
            key={r.label}
            href={r.href}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50"
          >
            <r.icon className="size-5 shrink-0 text-[#2874f0]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-gray-900">{r.label}</span>
              {r.sub && <span className="block truncate text-xs text-gray-500">{r.sub}</span>}
            </span>
            <ChevronRight className="size-4 shrink-0 text-gray-400" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function AccountHomePage() {
  const me = await getActor();

  if (!me?.email) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">Please log in to view your account.</p>
        <Link
          href="/auth/login?next=/account"
          className="mt-3 inline-block text-sm font-bold text-[#2874f0] hover:underline"
        >
          Sign In →
        </Link>
      </div>
    );
  }

  const ownerFilter = { OR: [{ userId: me.id }, { guestEmail: me.email }] };

  const [ordersCount, activeCount, wishlistCount] = await Promise.all([
    prisma.order.count({ where: ownerFilter }),
    prisma.order.count({
      where: { ...ownerFilter, status: { notIn: ["DELIVERED", "CANCELLED"] } },
    }),
    prisma.wishlist.count({ where: { userId: me.id } }),
  ]);

  // Sponsored slot: features OUR own in-stock products (no external ads).
  // Randomised over the FULL active+in-stock pool (no gate, no fixed window) so the
  // six cards differ per request and a product added later is eligible on the next
  // draw — the same dynamic guarantee the home /api/feed/random-ad route gives.
  // Images are loaded here too: a bare findMany returns no relation, so every tile
  // would fall through to the letter-initial placeholder.
  const adIds = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: { id: true },
  });
  const shuffled = [...adIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = a;
  }
  const sixIds = shuffled.slice(0, 6).map((r) => r.id);
  const sponsoredRows = sixIds.length
    ? await prisma.product.findMany({
        where: { id: { in: sixIds } },
        include: { images: { orderBy: { position: "asc" } } },
      })
    : [];
  const byId = new Map(sponsoredRows.map((r) => [r.id, r] as const));
  const sponsored = sixIds
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  // Flatten into a serializable VM for the client sliding card. Primary image first,
  // then first-by-position (same precedence home-slides uses), so <img src> always
  // receives a string — never an image object, which would render "[object Object]".
  const sponsoredVm = sponsored.map((p) => {
    const image = p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url ?? "";
    const price = Number(p.salePrice ?? 0);
    const mrp = Number(p.mrp ?? price);
    return {
      key: p.id,
      href: `/product/${p.slug ?? p.id}`,
      image,
      name: p.name,
      price,
      off: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
    };
  });

  const tiles: Row[] = [
    { href: "/account/orders", icon: Package, label: "Orders" },
    { href: "/account/wishlist", icon: Heart, label: "Wishlist" },
    { href: "/offers", icon: Ticket, label: "Coupons" },
    { href: "/account/support", icon: Headphones, label: "Help Center" },
  ];

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip pb-24 md:pb-6">
      {/* Profile hero (Flipkart's blue card) */}
      <header className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2874f0] to-[#1a55c0] p-5 text-white shadow-sm">
        <Sparkles className="absolute -right-4 -top-4 size-24 opacity-10" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-black">{me.name ?? "VoltKart Customer"}</h1>
            <p className="mt-0.5 truncate text-xs text-blue-100">{me.email}</p>
            <p className="mt-3 text-[13px] leading-snug text-blue-50">
              Fast delivery, easy returns and exclusive deals — all in one place.
            </p>
            <Link
              href="/products/all?sort=discount"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-black uppercase tracking-wider text-yellow-300 transition-transform active:scale-95"
            >
              Explore Deals
            </Link>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-black text-[#2874f0] shadow">
            <Package className="size-4" /> {ordersCount}
          </span>
        </div>
      </header>

      {/* 2×2 quick tiles */}
      <nav className="grid grid-cols-2 gap-3" aria-label="Quick actions">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="flex items-center gap-3 rounded-xl border bg-white px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <t.icon className="size-5 text-[#2874f0]" />
            <span className="text-sm font-bold text-gray-900">{t.label}</span>
          </Link>
        ))}
      </nav>

      {/* Recently viewed (Flipkart's account-page strip): per-shopper history from the
          same vk:recent:v1 the PDP writes; hides itself when there's no history. */}
      <AccountRecentlyViewed />

      {/* Sponsored — ONE dynamic feature card that slides right-to-left every 4s
          (no dots, no "View all", no secondary strip). The pool behind it is the
          per-request random six over ALL active+in-stock products, so it stays a
          dynamic ad and a product you add later is eligible on the next load. */}
      {sponsoredVm.length > 0 && (
        <section aria-label="Sponsored">
          <AccountSponsoredCard items={sponsoredVm} />
        </section>
      )}

      <Section
        title="Account Settings"
        rows={[
          { href: "/account/profile", icon: UserRound, label: "Edit Profile", sub: "Name, mobile & communication prefs" },
          { href: "/account/addresses", icon: MapPin, label: "Saved Addresses", sub: "Delivery & billing addresses" },
          { href: "/account/notifications", icon: Bell, label: "Notification Settings", sub: "Order alerts & offer updates" },
        ]}
      />

      <Section
        title="My Activity"
        rows={[
          { href: "/account/orders", icon: Package, label: "My Orders", sub: `${ordersCount} orders · ${activeCount} active` },
          { href: "/account/wishlist", icon: Heart, label: "My Wishlist", sub: `${wishlistCount} saved items` },
          { href: "/account/support", icon: Headphones, label: "Support & Returns", sub: "Tickets, refunds & delivery help" },
        ]}
      />

      <Section
        title="Help & Information"
        rows={[
          { href: "/contact", icon: Phone, label: "Contact Us", sub: "Email, phone & store support" },
          { href: "/products/all", icon: Store, label: "Browse All Products", sub: "Mobiles, laptops, appliances & more" },
        ]}
      />

      <LogoutButton />
    </div>
  );
}