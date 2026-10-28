"use client";

import { Search, ShoppingCart, User, ChevronDown, PackageCheck, LogOut, Settings, Sparkles,ArrowLeft, ShoppingBag, } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { NAV_CATEGORIES } from "@/lib/nav";

export function Header() {
  const pathname = usePathname();
  const isProduct = pathname.startsWith("/product/");
  const { items, ready, authed, user } = useCart();
  const cartCount = ready ? items.filter((i) => !i.savedForLater).reduce((s, i) => s + i.quantity, 0) : 0;
  
  return (
    <>
      {isProduct && (
        <div className="flex items-center gap-3 bg-[#2874f0] px-3 py-2.5 md:hidden">
          <Link href="/" aria-label="Back" className="shrink-0 text-white">
            <ArrowLeft className="size-5" />
          </Link>
          <Link
            href="/products/all"
            className="flex h-9 flex-1 items-center gap-2 rounded bg-white px-3 text-sm text-gray-500"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Search for products</span>
          </Link>
          <Link href="/cart" aria-label="Cart" className="shrink-0 text-white">
            <ShoppingBag className="size-5" />
          </Link>
        </div>
      )}
      <header className={cn("sticky top-0 z-40 bg-[#2874f0] text-white shadow", isProduct && "hidden md:block")}>
      {/* TOP BLUE BAR */}
      <div className="bg-[#2874f0] px-4 py-2.5 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          
          {/* LOGO */}
          <Link href="/" className="flex shrink-0 items-baseline gap-1 font-display text-xl font-bold italic tracking-tight">
            Volt<span className="text-yellow-300 not-italic font-black">Kart</span>
          </Link>

          {/* SEARCH BAR (Dominant) */}
          <form action="/products/all" method="get" className="relative hidden flex-1 md:block">
            <input
              name="q"
              placeholder="Search for products, brands and more"
              className="h-9 w-full rounded-sm border-none bg-white pl-4 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button type="submit" className="absolute right-3 top-2 text-[#2874f0]" aria-label="Search">
              <Search className="size-4" />
            </button>
          </form>

          {/* RIGHT ACTIONS */}
          <div className="ml-auto flex items-center gap-6 text-sm font-medium">
            
            {/* AUTHENTICATED USER MENU WITH DROPDOWN */}
            {authed ? (
              <div className="relative group hidden md:block">
                <button 
                  type="button" 
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  <User className="size-4" />
                  <span>{user?.name?.split(" ")[0]}</span>
                  <ChevronDown className="size-3 opacity-60" />
                </button>
                
                {/* Dropdown Content */}
                <div className="absolute right-0 top-full mt-1 w-48 origin-top-right rounded-lg border bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 ease-out transform translate-y-1 group-hover:translate-y-0">
                  <nav className="py-1 flex flex-col">
                    <a href="/account/profile" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Settings className="size-4" /> My Profile
                    </a>
                    
                    {/* THE ORDERS LINK */}
                    <a href="/account/orders" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium">
                      <PackageCheck className="size-4" /> 📦 My Orders
                    </a>
                    
                    <hr className="my-1 border-t border-gray-100" />
                    
                    <button
  type="button"
  onClick={async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Hard reload: clears the cookie AND wipes any in-memory auth/cart state
      // (CartContext's `authed`/`user`), so the header flips back to "Login".
      window.location.assign("/");
    }
  }}
  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
>
  <LogOut className="size-4" /> Sign Out
</button>
                  </nav>
                </div>
              </div>
            ) : (
              /* UNAUTHENTICATED STATE */
              <Link href="/auth/login" className="rounded-sm bg-white px-4 py-1 text-[#2874f0] font-bold hover:bg-gray-100 transition-colors shadow-sm">
                Login
              </Link>
            )}

            {/* CART ICON */}
            <Link href="/cart" className="relative flex items-center gap-2 hover:text-yellow-300 transition-colors">
              <ShoppingCart className="size-5" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-[#2874f0]">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* MOBILE SEARCH (Visible only on small screens) */}
        <div className="mt-2 block md:hidden">
          <form action="/products/all" method="get" className="relative">
            <input
              name="q"
              placeholder="Search for Products"
              className="h-9 w-full rounded-sm bg-white pl-4 pr-10 text-sm text-gray-800 focus:outline-none"
            />
            <button type="submit" className="absolute right-3 top-2 text-[#2874f0]">
              <Search className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {/* WHITE CATEGORY STRIP */}
      <nav className="border-b border-gray-200 bg-white px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
        <div className="container-x flex items-center justify-between overflow-x-auto no-scrollbar">
          <Link
  href="/"
  className={cn(
    "flex min-w-fit flex-col items-center gap-1 px-4 py-1 text-xs font-semibold transition-colors",
    pathname === "/" ? "text-[#2874f0]" : "text-gray-700 hover:text-[#2874f0]",
  )}
>
  <span
    className={cn(
      "grid size-8 place-items-center rounded-lg",
      pathname === "/" ? "bg-[#2874f0]/10 ring-1 ring-[#2874f0]/40" : "bg-gray-100",
    )}
  >
    <Sparkles className="size-4" />
  </span>
  For You
  <span className={cn("h-0.5 w-full rounded-full", pathname === "/" ? "bg-[#2874f0]" : "bg-transparent")} />
</Link>
          {NAV_CATEGORIES.map((c) => {
            const active = pathname === `/products/${c.slug}` || pathname.startsWith(`/products/${c.slug}/`);
            return (
              <Link
                key={c.slug}
                href={`/products/${c.slug}`}
                className={cn(
                  "flex min-w-fit items-center gap-2 px-4 py-1 text-xs font-semibold transition-colors",
                  active ? "text-[#2874f0] underline decoration-2 underline-offset-4" : "text-gray-700 hover:text-[#2874f0]"
                )}
              >
                {/* Simple icon simulation using initials or emoji if you don't have SVGs */}
                <span className="grid size-6 place-items-center rounded-full bg-gray-100 text-[10px]">
                  {c.name.charAt(0)}
                </span>
                {c.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
    </>
  );
}