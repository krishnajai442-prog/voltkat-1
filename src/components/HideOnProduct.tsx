"use client";

import { usePathname } from "next/navigation";

// Renders its children everywhere EXCEPT the storefront product detail page
// (/product/<slug>). Note the regex: "/product/" (singular) matches the PDP,
// while "/products/..." (plural, your category routes) is NOT matched — so
// category/cart/account pages keep their bottom nav.
export function HideOnProduct({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (/^\/product(\/|$)/.test(pathname)) return null;
  return <>{children}</>;
}