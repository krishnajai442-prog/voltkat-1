"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { inr } from "@/lib/utils";

type Line = {
  productId: string;
  quantity: number;
  savedForLater: boolean;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
} | null;

type QuoteCoupon = {
  code: string;
  discount: number;
  description: string | null;
  couponId: string;
  type: "PERCENT" | "FIXED";
  value: number;
};

type QuoteLine = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  mrp: number;
  salePrice: number;
  quantity: number;
  lineMrp: number;
  lineTotal: number;
  discountPercent: number;
  stock: number;
  inStock: boolean;
  categorySlug: string;
  brandSlug: string;
  emiEligible: boolean;
  exchangeEligible: boolean;
};

type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotalMrp: number;
  subtotal: number;
  itemDiscount: number;
  coupon: QuoteCoupon | null;
  couponError: string | null;
  deliveryFee: number;
  codFee: number;
  total: number;
  savingsTotal: number;
  gstComponent: number;
  etaFrom: string;
  etaTo: string;
  stockIssues: {
    productId: string;
    name: string;
    requested: number;
    available: number;
  }[];
  couponApplicableSubtotal: number;
};

type CartCtx = {
  ready: boolean;
  user: SessionUser;
  authed: boolean;
  items: Line[];
  wishlist: string[];
  quote: Quote | null;
  quoting: boolean;
  couponCode: string | null;
  deliveryMode: "STANDARD" | "EXPRESS";
  setDeliveryMode: (mode: "STANDARD" | "EXPRESS") => void;
  add: (productId: string, quantity?: number) => Promise<void>;
  setQty: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  saveForLater: (productId: string, saved: boolean) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  inWishlist: (productId: string) => boolean;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
  refreshQuote: () => Promise<void>;
  setUser: (user: SessionUser) => Promise<void>;
};

const LS_CART = "vk_cart_v1";
const LS_WISHLIST = "vk_wishlist_v1";

const Ctx = createContext<CartCtx | null>(null);

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}


function safeLineArray(raw: unknown): Line[] {
  return Array.isArray(raw) ? (raw as Line[]) : [];
}

function safeStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? (raw as string[]) : [];
}

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/* Public localStorage helpers.
   Generic default `any` + permissive signature so any call shape
   (with/without type args, with/without fallback, guarded or not)
   type-checks without further edits. Runtime stays sane: returns the
   fallback when given, otherwise null/undefined. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lsRead<T = any>(key: string, fallback?: T): T {
  if (typeof window === "undefined") return (fallback ?? (undefined as unknown as T));
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return (fallback ?? (undefined as unknown as T));
    return JSON.parse(raw) as T;
  } catch {
    return (fallback ?? (undefined as unknown as T));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lsWrite<T = any>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export { inr } from "@/lib/utils";
export const RECENT_SEARCH_KEY = "vk_recent_search_v1";

function activeLines(items: Line[]) {
  return items
    .filter((i) => !i.savedForLater)
    .map((i) => ({ productId: i.productId, quantity: i.quantity }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUserState] = useState<SessionUser>(null);
  const [items, setItems] = useState<Line[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"STANDARD" | "EXPRESS">("STANDARD");

  const itemsRef = useRef(items);
  const couponRef = useRef(couponCode);
  const deliveryRef = useRef(deliveryMode);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    couponRef.current = couponCode;
  }, [couponCode]);

  useEffect(() => {
    deliveryRef.current = deliveryMode;
  }, [deliveryMode]);

  /* boot */
  useEffect(() => {
    let alive = true;

    (async () => {
      const local = readLS<Line[]>(LS_CART, []);
      setWishlist(readLS<string[]>(LS_WISHLIST, []));

      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const json = (await res.json()) as { user?: SessionUser };
        if (!alive) return;

        const u = json.user ?? null;
        setUserState(u);

        if (u) {
          const merged = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ merge: local }),
            cache: "no-store",
          });
          const data = (await merged.json()) as { items?: Line[] };
          if (alive) setItems(safeLineArray(data.items));
          writeLS(LS_CART, []);

          try {
            const wl = await fetch("/api/wishlist", { cache: "no-store" });
            const wlJson = (await wl.json()) as { ids?: string[] };
            if (alive) setWishlist(safeStringArray(wlJson.ids));
          } catch {
            /* non-blocking */
          }
        } else {
          if (alive) setItems(safeLineArray(local));
        }
      } catch {
        if (alive) setItems(safeLineArray(local));
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const refreshQuote = useCallback(async () => {
    const active = activeLines(itemsRef.current);

    if (!active.length) {
      setQuote(null);
      setQuoting(false);
      return;
    }

    setQuoting(true);
    try {
      const res = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: active,
          couponCode: couponRef.current,
          deliveryMode: deliveryRef.current,
        }),
      });

      const json = (await res.json()) as { ok: boolean; quote?: Quote; error?: string };

      if (json.ok && json.quote) {
        setQuote(json.quote);
      } else {
        setQuote(null);
      }
    } catch {
      setQuote(null);
    } finally {
      setQuoting(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      void refreshQuote();
    }, 250);
    return () => window.clearTimeout(t);
  }, [ready, items, couponCode, deliveryMode, refreshQuote]);

  const setUser = useCallback(async (u: SessionUser) => {
    setUserState(u);

    if (!u) {
      setItems(readLS<Line[]>(LS_CART, []));
      setWishlist(readLS<string[]>(LS_WISHLIST, []));
      return;
    }

    const local = readLS<Line[]>(LS_CART, []);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merge: local }),
        cache: "no-store",
      });
      const data = (await res.json()) as { items?: Line[] };
      setItems(safeLineArray(data.items));
      writeLS(LS_CART, []);

      const wl = await fetch("/api/wishlist", { cache: "no-store" });
      const wlJson = (await wl.json()) as { ids?: string[] };
      setWishlist(safeStringArray(wlJson.ids));
    } catch {
      setItems(local);
    }
  }, []);

  const add = useCallback(
    async (productId: string, quantity = 1) => {
      const current = items.find((i) => i.productId === productId);
      const nextQty = Math.min(10, (current?.quantity ?? 0) + quantity);

      if (user) {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity: nextQty, savedForLater: false }),
        });
        const json = (await res.json()) as { items?: Line[]; error?: string };
        setItems(safeLineArray(json.items));
        return;
      }

      setItems((prev) => {
        const exists = prev.find((i) => i.productId === productId);
        const next = exists
          ? prev.map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.min(10, i.quantity + quantity), savedForLater: false }
                : i,
            )
          : [...prev, { productId, quantity: Math.min(10, quantity), savedForLater: false }];
        writeLS(LS_CART, next);
        return next;
      });
    },
    [items, user],
  );

  const setQty = useCallback(
    async (productId: string, quantity: number) => {
      if (quantity <= 0) {
        await remove(productId);
        return;
      }

      const capped = Math.min(10, quantity);

      if (user) {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity: capped }),
        });
        const json = (await res.json()) as { items?: Line[] };
        setItems(safeLineArray(json.items));
        return;
      }

      setItems((prev) => {
        const next = prev.map((i) =>
          i.productId === productId ? { ...i, quantity: capped } : i,
        );
        writeLS(LS_CART, next);
        return next;
      });
    },
    [user],
  );

  async function remove(productId: string) {
    if (user) {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 0 }),
      });
      const json = (await res.json()) as { items?: Line[] };
      setItems(safeLineArray(json.items));
      return;
    }

    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      writeLS(LS_CART, next);
      return next;
    });
  }

  const saveForLater = useCallback(
    async (productId: string, saved: boolean) => {
      if (user) {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, savedForLater: saved }),
        });
        const json = (await res.json()) as { items?: Line[] };
        setItems(safeLineArray(json.items));
        return;
      }

      setItems((prev) => {
        const next = prev.map((i) =>
          i.productId === productId ? { ...i, savedForLater: saved } : i,
        );
        writeLS(LS_CART, next);
        return next;
      });
    },
    [user],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (user) {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        const json = (await res.json()) as { ok: boolean; added?: boolean };
        if (json.ok) {
          setWishlist((prev) =>
            json.added
              ? Array.from(new Set([...prev, productId]))
              : prev.filter((id) => id !== productId),
          );
        }
        return;
      }

      setWishlist((prev) => {
        const next = prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId];
        writeLS(LS_WISHLIST, next);
        return next;
      });
    },
    [user],
  );

  const applyCoupon = useCallback(
    async (code: string): Promise<{ ok: boolean; message: string }> => {
      const active = activeLines(itemsRef.current);
      if (!active.length) {
        return { ok: false, message: "Add items to your cart first." };
      }

      try {
        const res = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, items: active }),
        });

        const json = (await res.json()) as {
          ok: boolean;
          coupon?: QuoteCoupon;
          error?: string;
        };

        if (json.ok && json.coupon) {
          setCouponCode(code.toUpperCase());
          return {
            ok: true,
            message: `${code.toUpperCase()} applied — you saved ${inr(json.coupon.discount)}.`,
          };
        }

        return { ok: false, message: json.error ?? "Coupon is not valid for this cart." };
      } catch {
        return { ok: false, message: "Could not validate coupon. Try again." };
      }
    },
    [],
  );

  const removeCoupon = useCallback(() => {
    setCouponCode(null);
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      ready,
      user,
      authed: Boolean(user),
      items,
      wishlist,
      quote,
      quoting,
      couponCode,
      deliveryMode,
      setDeliveryMode,
      add,
      setQty: (productId, quantity) => setQty(productId, quantity),
      remove,
      saveForLater,
      toggleWishlist,
      inWishlist: (productId) => wishlist.includes(productId),
      applyCoupon,
      removeCoupon,
      refreshQuote,
      setUser,
    }),
    [
      ready,
      user,
      items,
      wishlist,
      quote,
      quoting,
      couponCode,
      deliveryMode,
      add,
      setQty,
      saveForLater,
      toggleWishlist,
      applyCoupon,
      removeCoupon,
      refreshQuote,
      setUser,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}