"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Info,
  Loader2,
  MapPin,
  Phone,
  Star,
  Truck,
  Zap,
  Trash2,
} from "lucide-react";
import { PincodeChecker } from "./PincodeChecker";
import { SavedAddressCard } from "./SavedAddressCard";
import { FrequentlyBoughtSheet } from "@/components/product/FrequentlyBoughtSheet";
import { CheckoutLineRow } from "@/components/checkout/CheckoutLineRow";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { QuantityStepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toaster";
import { useCart } from "@/context/CartContext";
import type { AddressVM } from "@/lib/address-types";
import { cn, inr, MOBILE_RE, PINCODE_RE } from "@/lib/utils";

type PaymentMethod = "UPI" | "CARD" | "NETBANKING" | "WALLET" | "COD";

type CheckoutLine = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  mrp: number;
  salePrice: number;
  quantity: number;
  lineTotal: number;
  stock: number;
  inStock: boolean;
  codEligible: boolean;
  // Optional enrichment Ã¢â‚¬â€ rendered only when /api/cart/quote provides them.
  color?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  protectFee?: number | null;
};

type CheckoutCoupon = {
  code: string;
  discount: number;
  description: string | null;
};

type CheckoutQuote = {
  lines: CheckoutLine[];
  itemCount: number;
  subtotalMrp: number;
  subtotal: number;
  itemDiscount: number;
  coupon: CheckoutCoupon | null;
  couponError: string | null;
  deliveryFee: number;
  codFee: number;
  total: number;
  savingsTotal: number;
  gstComponent: number;
  deliveryMode: "STANDARD" | "EXPRESS";
  etaFrom: string;
  etaTo: string;
  stockIssues: {
    productId: string;
    name: string;
    requested: number;
    available: number;
  }[];
};

type RazorpayConfig = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  timeout: number;
  notes?: Record<string, string>;
  prefill?: Record<string, string>;
  theme?: { color: string };
};

const emptyAddress = {
  fullName: "",
  phone: "",
  altPhone: "",
  pincode: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
};

export function CheckoutWizard({
  addresses,
  defaultPincode,
  razorpayKey,
}: {
  addresses: AddressVM[];
  defaultPincode?: string;
  razorpayKey?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  // `push` is referentially stable (useCallback([]) inside Toaster), so it is
  // safe to list in a dependency array WITHOUT restarting the debounce timer.
  const push = toast.push;
  const {
    ready,
    user,
    items,
    couponCode,
    deliveryMode,
    setDeliveryMode,
    setQty,
    remove,
  } = useCart();

  const [step, setStep] = useState(addresses.length > 0 ? 2 : 1);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [quoteNonce, setQuoteNonce] = useState(0);
  // Buy-now isolation: when set, the entire checkout (quote, payload, cleanup)
  // is scoped to just these product ids. Null = normal full-cart checkout.
  const [buyNowScope, setBuyNowScope] = useState<string[] | null>(null);
  const [scopeResolved, setScopeResolved] = useState(false);
  const [upsellPending, setUpsellPending] = useState(false);
  const [upsellSeed, setUpsellSeed] = useState<string | null>(null);

  const [checkoutQuote, setCheckoutQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [addressMode, setAddressMode] = useState<"saved" | "new">(
    user && addresses.length > 0 ? "saved" : "new",
  );
    const [selectedAddressId, setSelectedAddressId] = useState(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "",
  );

  // Context `user` resolves AFTER first paint (session fetch), so addressMode can latch
  // to "new" for logged-in users and the summary card then renders "Ã¢â‚¬â€" placeholders.
  // Re-latch to the saved book once the session lands; a shopper who later toggles to
  // "new" keeps their choice because these deps never change again.
  useEffect(() => {
    if (ready && user && addresses.length > 0) {
      setAddressMode("saved");
      setSelectedAddressId((cur) => cur || addresses.find((a) => a.isDefault)?.id || addresses[0]?.id || "");
    }
  }, [ready, user, addresses]);

  // Pre-fill name + last-used PIN (restores behaviour a stray comment had dropped).
  const [addressForm, setAddressForm] = useState({
    ...emptyAddress,
    fullName: user?.name ?? "",
    pincode: defaultPincode ?? "",
  });

  // ---- SINGLE source of truth for the PIN check (parent-owned) ----
  const [pinStatus, setPinStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pinMsg, setPinMsg] = useState("");
  const pinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPin = useRef<string>("");
  // Signature of the last typed address we pushed to the book, so pressing
  // Continue twice (or going Back and forward) can't create a duplicate row.
  const lastSavedAddrSig = useRef<string>("");

  // Depends on the PRIMITIVE pincode string only. Writing city/state on success
  // keeps that string identical, so this never re-fires -> no loop, no flicker,
  // and typing name/mobile can't cancel the in-flight 700ms timer.
  useEffect(() => {
    if (pinTimer.current) clearTimeout(pinTimer.current);

    const pincode = addressForm.pincode;
    if (pincode.length !== 6) {
      setPinStatus("idle");
      setPinMsg("");
      lastPin.current = ""; // allow re-validating the same PIN after a clear
      return;
    }
    if (pincode === lastPin.current) return; // ignore duplicate
    pinTimer.current = setTimeout(async () => {
      lastPin.current = pincode;
      setPinStatus("loading");
      setPinMsg("Checking serviceability...");
      try {
        const res = await fetch("/api/delivery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pincode }),
        });
        const data = await res.json();

        if (res.status === 429) {
          setPinStatus("error");
          setPinMsg("Too many attempts. Please wait a moment.");
          push({ tone: "warn", title: "Slow Down", body: "Please wait 30 seconds before checking another PIN." });
          return;
        }

        if (data.ok && data.result?.serviceable) {
          const eta = data.result.etaTo
            ? new Date(data.result.etaTo).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "soon";
          setPinStatus("success");
          setPinMsg(`Delivery available by ${eta}`);
          // A PIN change MUST move the city/state, so overwrite (don't keep a
          // stale auto-fill). Manual edits are re-applied by the user if needed.
          setAddressForm((prev) => ({
            ...prev,
            pincode,
            city: data.result.cityHint ?? "",
            state: data.result.region ?? "",
          }));
        } else {
          const errorMsg = data.error || "We do not deliver to this PIN code.";
          setPinStatus("error");
          setPinMsg(errorMsg);
          push({ tone: "error", title: "Delivery Unavailable", body: errorMsg });
        }
      } catch {
        setPinStatus("error");
        setPinMsg("Network error. Please try again.");
        push({ tone: "error", title: "Network Error", body: "Could not verify PIN code. Check your connection." });
      }
    }, 700);

    return () => {
      if (pinTimer.current) clearTimeout(pinTimer.current);
    };
  }, [addressForm.pincode, push]);

  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [note, setNote] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    razorpayKey ? "UPI" : "COD",
  );

    const activeItems = useMemo(() => {
    const base = items.filter((i) => !i.savedForLater);
    const scoped = buyNowScope
      ? base.filter((i) => buyNowScope.includes(i.productId))
      : base;
    return scoped.map((i) => ({ productId: i.productId, quantity: i.quantity }));
  }, [items, buyNowScope]);

  const itemsKey = useMemo(() => JSON.stringify(activeItems), [activeItems]);

  const savedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;
  const useSavedAddress = Boolean(user && addressMode === "saved" && savedAddress);

  const effectivePincode = useSavedAddress
    ? savedAddress?.pincode ?? ""
    : PINCODE_RE.test(addressForm.pincode)
      ? addressForm.pincode
      : "";

  const codAllowed =
    !checkoutQuote || checkoutQuote.lines.every((l) => l.codEligible);

    useEffect(() => {
    if (ready && activeItems.length === 0) {
      router.replace("/cart");
    }
  }, [ready, activeItems.length, router]);

  // Resolve the buy-now scope from the URL once, on mount, BEFORE the first
  // quote fires. Reads window.location (not useSearchParams) so the wizard
  // needs no <Suspense> boundary and can't trip the Next build. Always flips
  // scopeResolved, so a normal ?-less checkout quotes exactly as before.
    useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const buy = params.get("buy");
      const buyIds = buy ? buy.split(",").map((s) => s.trim()).filter(Boolean) : [];
      // Buy-now with the upsell flag: pause the quote (scopeResolved stays false) and
      // show the sheet; the sheet hands back the final scoped id list on Skip & Continue.
      if (params.get("upsell") === "1" && buyIds[0]) {
        setUpsellSeed(buyIds[0]);
        setUpsellPending(true);
        return;
      }
      if (buyIds.length) setBuyNowScope(buyIds); // comma-list = seed + chosen add-ons
    } catch {
      /* ignore */
    }
    setScopeResolved(true);
  }, []);
  
  useEffect(() => {
    if (!razorpayKey && paymentMethod !== "COD") {
      setPaymentMethod("COD");
    }
  }, [razorpayKey, paymentMethod]);

  useEffect(() => {
    if (paymentMethod === "COD" && !codAllowed && razorpayKey) {
      setPaymentMethod("UPI");
    }
  }, [paymentMethod, codAllowed, razorpayKey]);

  useEffect(() => {
    let alive = true;

      if (!ready || !scopeResolved || !activeItems.length) {
      setCheckoutQuote(null);
      return;
    }

        let timer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const run = () => {
      setQuoteLoading(true);
      fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: activeItems,
          couponCode,
          deliveryMode,
          paymentMethod,
          pincode: effectivePincode || undefined,
        }),
      })
        .then(async (r) => {
          const json = (await r.json().catch(() => null)) as {
            ok: boolean;
            quote?: CheckoutQuote;
            error?: string;
          } | null;
          if (!alive) return;
          if (r.status === 429) {
            // Rate-limited: keep the LAST GOOD quote on screen and retry silently with
            // backoff. A shopper tapping the stepper must never see a raw 429 banner;
            // only sustained abuse past three silent retries surfaces a gentle note.
            if (attempts < 3) {
              attempts += 1;
              retryTimer = setTimeout(run, 1200 * attempts);
            } else {
              setError("Prices are refreshing a little slowly. Please wait a moment.");
            }
            return;
          }
          attempts = 0;
          if (json && json.ok && json.quote) {
            setCheckoutQuote(json.quote);
            setError(null);
          } else {
            setError(json?.error ?? "Could not calculate checkout total.");
          }
        })
        .catch(() => {
          if (alive) setError("Could not calculate checkout total.");
        })
        .finally(() => {
          if (alive) setQuoteLoading(false);
        });
    };

    // Coalesce rapid changes (stepper taps, pin typing, step flips) into ONE request.
    timer = setTimeout(run, 350);

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [
    ready,
    itemsKey,
    couponCode,
    deliveryMode,
    paymentMethod,
    effectivePincode,
    quoteNonce,
    activeItems,
    scopeResolved,
  ]);

  function validateAddressStep(): string | null {
    if (!user && !guestEmail.trim() && !guestPhone.trim()) {
      return "Guest checkout requires an email or mobile number.";
    }

    if (!user && guestPhone.trim() && !MOBILE_RE.test(guestPhone.trim())) {
      return "Enter a valid 10-digit mobile number.";
    }

    if (useSavedAddress) return null;

    const a = addressForm;
    if (!a.fullName.trim()) return "Full name is required.";
    if (!MOBILE_RE.test(a.phone.trim())) return "Enter a valid delivery mobile number.";
    if (a.altPhone.trim() && !MOBILE_RE.test(a.altPhone.trim())) {
      return "Alternate mobile number is invalid.";
    }
    if (!PINCODE_RE.test(a.pincode.trim())) return "Enter a valid 6-digit PIN code.";
    if (a.line1.trim().length < 2) return "Address line must be at least 2 characters.";
    if (!a.city.trim()) return "City is required.";
    if (!a.state.trim()) return "State is required.";

    return null;
  }

  function validatePaymentStep(): string | null {
    if (!checkoutQuote || checkoutQuote.lines.length === 0) {
      return "Cart is empty.";
    }
    if (checkoutQuote.stockIssues.length > 0) {
      return "Some items have stock issues. Adjust your cart before continuing.";
    }
    if (paymentMethod !== "COD" && !razorpayKey) {
      return "Online payments are not configured. Choose Cash on Delivery.";
    }
    if (paymentMethod === "COD" && !codAllowed) {
      return "COD is not available for all items in this cart.";
    }
    return null;
  }

  function buildPayload() {
    const addressPayload = useSavedAddress
      ? undefined
      : {
          label: "Checkout",
          fullName: addressForm.fullName.trim(),
          phone: addressForm.phone.trim(),
          altPhone: addressForm.altPhone.trim() || undefined,
          pincode: addressForm.pincode.trim(),
          line1: addressForm.line1.trim(),
          line2: addressForm.line2.trim() || undefined,
          city: addressForm.city.trim(),
          state: addressForm.state.trim(),
        };

    return {
      items: activeItems,
      couponCode,
      deliveryMode,
      paymentMethod,
      pincode: effectivePincode || undefined,
      addressId: useSavedAddress ? selectedAddressId : undefined,
      address: addressPayload,
      guestEmail: user ? undefined : guestEmail.trim() || undefined,
      guestPhone: user ? undefined : guestPhone.trim() || undefined,
      note: note.trim() || undefined,
    };
  }

  async function clearLocalCart() {
    try {
      for (const item of activeItems) {
        await remove(item.productId);
      }
    } catch {
      /* non-blocking */
    }
  }

  async function placeCodOrder() {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });

    const json = (await res.json()) as {
      ok: boolean;
      error?: string;
      code?: string;
      conflicts?: { name: string }[];
      order?: { orderNumber: string };
    };

    if (!json.ok || !json.order) {
      if (json.code === "STOCK_CONFLICT") {
        setQuoteNonce((n) => n + 1);
      }
      throw new Error(
        json.conflicts?.length
          ? `Stock changed: ${json.conflicts.map((c) => c.name).join(", ")}`
          : json.error ?? "Could not place order.",
      );
    }

    await clearLocalCart();
    toast.push({ title: "Order placed", body: "Cash on delivery confirmed." });
    router.push(`/order/${json.order.orderNumber}/response`);
  }

  async function startOnlinePayment() {
    const res = await fetch("/api/razorpay/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });

    const json = (await res.json()) as {
      ok: boolean;
      error?: string;
      code?: string;
      conflicts?: { name: string }[];
      rzp?: RazorpayConfig;
    };

    if (!json.ok || !json.rzp) {
      if (json.code === "STOCK_CONFLICT") {
        setQuoteNonce((n) => n + 1);
      }
      throw new Error(
        json.conflicts?.length
          ? `Stock changed: ${json.conflicts.map((c) => c.name).join(", ")}`
          : json.error ?? "Could not start payment.",
      );
    }

    openRazorpay(json.rzp);
  }

  function openRazorpay(config: RazorpayConfig) {
    const RazorpayCtor = (
      window as unknown as {
        Razorpay?: new (options: unknown) => {
          open: () => void;
          on: (event: string, handler: (resp: any) => void) => void;
        };
      }
    ).Razorpay;

    if (!RazorpayCtor) {
      setError("Razorpay checkout script did not load. Refresh and try again.");
      setPlacing(false);
      return;
    }

    const rzp = new RazorpayCtor(config);

    rzp.on("payment.failed", (resp) => {
      setError(
        resp?.error?.description ??
          "Payment failed. If amount was debited, it will be auto-reversed by your bank/UPI app.",
      );
      setPlacing(false);
    });

    rzp.on("payment.success", async (resp) => {
      try {
        const verifyRes = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          }),
        });

        const verifyJson = (await verifyRes.json()) as {
          ok: boolean;
          orderNumber?: string;
          error?: string;
          code?: string;
        };

        if (!verifyJson.ok) {
          if (
            verifyJson.code === "STOCK_CONFLICT" ||
            verifyJson.code === "STOCK_REFUNDED"
          ) {
            setQuoteNonce((n) => n + 1);
          }
          throw new Error(verifyJson.error ?? "Payment verification failed.");
        }

        if (verifyJson.orderNumber) {
          await clearLocalCart();
          toast.push({ title: "Payment successful", body: "Order confirmed." });
          router.push(`/order/${verifyJson.orderNumber}/response`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment verification failed.");
        setPlacing(false);
      }
    });

    rzp.open();
    setPlacing(false);
  }

  async function placeOrder() {
    setError(null);

    const paymentErr = validatePaymentStep();
    if (paymentErr) {
      setError(paymentErr);
      setStep(3);
      return;
    }

    setPlacing(true);

    try {
      if (paymentMethod === "COD") {
        await placeCodOrder();
      } else {
        await startOnlinePayment();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order.");
      setPlacing(false);
    }
  }

   // ---- Persist a typed checkout address into the account book ----
  // Mirrors the field shape /api/account/addresses validates (the same shape the
  // addresses page posts). Runs only for logged-in users in "new" mode.
  function typedAddressSignature() {
    const a = addressForm;
    return JSON.stringify([
      a.fullName.trim(), a.phone.trim(), a.altPhone.trim(),
      a.pincode.trim(), a.line1.trim(), a.line2.trim(),
      a.city.trim(), a.state.trim(),
    ]);
  }

  function typedAddressAlreadyInBook() {
    const a = addressForm;
    const eq = (x: string, y: string | null | undefined) =>
      (x || "").trim().toLowerCase() === (y || "").trim().toLowerCase();
    return addresses.some(
      (s) =>
        eq(s.fullName, a.fullName) &&
        eq(s.phone, a.phone) &&
        eq(s.pincode, a.pincode) &&
        eq(s.line1, a.line1) &&
        eq(s.city, a.city) &&
        eq(s.state, a.state),
    );
  }

  async function saveTypedAddressToBook() {
    if (!user || addressMode !== "new") return;        // guests / saved-mode: nothing to do
    if (typedAddressAlreadyInBook()) {                 // identical row already exists
      lastSavedAddrSig.current = typedAddressSignature();
      return;
    }
    const sig = typedAddressSignature();
    if (sig === lastSavedAddrSig.current) return;      // already saved this exact text this session
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: "Home",                               // editable later on /account/addresses
          fullName: addressForm.fullName.trim(),
          phone: addressForm.phone.trim(),
          altPhone: addressForm.altPhone.trim() || undefined,
          pincode: addressForm.pincode.trim(),
          line1: addressForm.line1.trim(),
          line2: addressForm.line2.trim() || undefined,
          city: addressForm.city.trim(),
          state: addressForm.state.trim(),
          isDefault: false,                            // never hijack their existing default
        }),
      });
      const json = (await res.json().catch(() => ({} as { ok?: boolean }))) as { ok?: boolean };
      if (json.ok) {
        lastSavedAddrSig.current = sig;
        toast.push({ title: "Address saved", body: "Added to your saved addresses." });
      }
      // On failure we deliberately do NOT throw Ã¢â‚¬â€ the order still uses the snapshot.
    } catch {
      /* network hiccup Ã¢â‚¬â€ non-blocking */
    }
  }

  async function nextStep() {
    setError(null);

    if (step === 1) {
      const err = validateAddressStep();
        if (err) {
        setError(err);
        return;
      }
      await saveTypedAddressToBook();   // persist typed address to the book (non-blocking on error)
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
    }
  }

    if (upsellPending && upsellSeed) {
    return (
      <FrequentlyBoughtSheet
        seedId={upsellSeed}
        onContinue={(ids) => {
          setBuyNowScope(ids.length ? ids : [upsellSeed]);
          setUpsellPending(false);
          setScopeResolved(true);
        }}
        onAbort={() => router.back()}
      />
    );
  }

  if (!ready || !checkoutQuote) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-[32rem] rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (checkoutQuote.lines.length === 0) {
    return null;
  }

  const etaLabel = `${new Date(checkoutQuote.etaFrom).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })} Ã¢â‚¬â€œ ${new Date(checkoutQuote.etaTo).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })}`;

  const _dd = new Date(checkoutQuote.etaTo);
  const deliveryDateLabel = `${_dd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${_dd.toLocaleDateString("en-IN", { weekday: "short" })}`;

  // Read-only address summary for the Order-Summary step (saved address or the
  // just-typed form), so the deliver-to card works for members and guests alike.
  const displayAddress =
    useSavedAddress && savedAddress
      ? {
          name: savedAddress.fullName,
          tag: savedAddress.label,
          line: [savedAddress.line1, savedAddress.line2, savedAddress.city, savedAddress.state]
            .filter(Boolean)
            .join(", ") + ` Ã¢â‚¬â€ ${savedAddress.pincode}`,
          phone: savedAddress.phone,
        }
      : {
          name: addressForm.fullName || "Ã¢â‚¬â€",
          tag: null as string | null,
          line:
            [addressForm.line1, addressForm.line2, addressForm.city, addressForm.state]
              .filter(Boolean)
              .join(", ") + (addressForm.pincode ? ` Ã¢â‚¬â€ ${addressForm.pincode}` : ""),
          phone: addressForm.phone || "Ã¢â‚¬â€",
        };

  const stepLabels = ["Address", "Order Summary", "Payment"];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-5">
        <ol className="flex items-center gap-2 text-[12px] font-bold">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full",
                  step >= n ? "bg-electric-500 text-white" : "bg-canvas text-ink-400",
                )}
              >
                {step > n ? <Check className="size-3.5" /> : n}
              </span>
              <span className={step >= n ? "text-ink-900" : "text-ink-300"}>
                {stepLabels[n - 1]}
              </span>
              {n < 3 && <span className="text-ink-300">/</span>}
            </li>
          ))}
        </ol>

        {error && (
          <p role="alert" className="rounded-xl bg-flame-500/10 px-4 py-3 text-[13px] font-semibold text-flame-600">
            {error}
          </p>
        )}

        {step === 1 && (
          <section className="card space-y-4 p-5">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <MapPin className="size-4 text-electric-600" />
              Delivery address
            </h2>

            {user && addresses.length > 0 && addressMode === "new" && (
              <Button size="sm" variant="outline" onClick={() => setAddressMode("saved")}>
                Ã¢â€ Â Use a saved address
              </Button>
            )}

            {user && addressMode === "saved" && addresses.length > 0 ? (
              <SavedAddressCard
                addresses={addresses}
                selectedId={selectedAddressId}
                onSelect={setSelectedAddressId}
                onAddNew={() => setAddressMode("new")}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {!user && (
                  <>
                    <Input
                      containerClassName="sm:col-span-2"
                      label="Guest email or mobile required"
                      hint="Add at least one contact channel for order updates."
                    />
                    <Input
                      label="Email (optional if mobile given)"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@email.com"
                    />
                    <Input
                      label="Mobile (optional if email given)"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      inputMode="numeric"
                      placeholder="9876543210"
                    />
                  </>
                )}

                <Input
                  containerClassName="sm:col-span-2"
                  label="Full name"
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  required
                />

                {/* Delivery Mobile with +91 prefix */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-gray-500">
                    <Phone className="size-3" /> Delivery Mobile
                  </label>
                  <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white transition-all focus-within:border-[#2874f0] focus-within:ring-2 focus-within:ring-blue-100">
                    <span className="select-none border-r border-gray-300 bg-gray-100 px-3 py-3 text-sm font-bold text-gray-600">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={addressForm.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setAddressForm({ ...addressForm, phone: val });
                      }}
                      className="h-11 flex-1 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      placeholder="9876543210"
                      required
                    />
                  </div>
                  {addressForm.phone && addressForm.phone.length < 10 && (
                    <p className="text-[11px] font-semibold text-orange-500">
                      Please enter a valid 10-digit mobile number.
                    </p>
                  )}
                </div>

                {/* Alternate Mobile with +91 prefix */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-gray-500">
                    Alternate mobile
                  </label>
                  <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white transition-all focus-within:border-[#2874f0] focus-within:ring-2 focus-within:ring-blue-100">
                    <span className="select-none border-r border-gray-300 bg-gray-100 px-3 py-3 text-sm font-bold text-gray-600">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={addressForm.altPhone || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setAddressForm({ ...addressForm, altPhone: val });
                      }}
                      className="h-11 flex-1 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                {/* Controlled PIN checker Ã¢â‚¬â€ value + status live in the parent */}
                <PincodeChecker
                  value={addressForm.pincode}
                  onChange={(v) => setAddressForm((prev) => ({ ...prev, pincode: v }))}
                  status={pinStatus}
                  msg={pinMsg}
                />

                <Input
                  label="City"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))}
                  required
                />

                <Input
                  containerClassName="sm:col-span-2"
                  label="Flat, house no., building, street"
                  value={addressForm.line1}
                  onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                  required
                />
                <Input
                  containerClassName="sm:col-span-2"
                  label="Area, landmark"
                  value={addressForm.line2}
                  onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                />
                <Input
                  label="State"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value }))}
                  required
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={nextStep}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            {/* Deliver-to summary card with Change (mirrors the reference) */}
            <div className="card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Deliver to</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] font-bold text-ink-900">
                  {displayAddress.name}
                  {displayAddress.tag && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                      {displayAddress.tag}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-gray-600">{displayAddress.line}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-700">
                  <Phone className="size-3" /> {displayAddress.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="shrink-0 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#2874f0] transition-colors hover:border-[#2874f0] hover:bg-blue-50"
              >
                Change
              </button>
            </div>

            {checkoutQuote.stockIssues.length > 0 && (
              <p className="rounded-xl bg-flame-500/10 px-4 py-3 text-[13px] font-semibold text-flame-600">
                Stock changed for some items. Adjust your cart before placing the order.
              </p>
            )}

            {/* Product cards */}
            <div className="card divide-y divide-hairline">
              {checkoutQuote.lines.map((line) => {
                const d = line.mrp > line.salePrice ? Math.round(((line.mrp - line.salePrice) / line.mrp) * 100) : 0;
                return (
                  <div key={line.productId} className="flex items-start gap-3 p-4">
                    <span className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-canvas">
                      {line.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={line.image} alt={line.name} className="size-full object-contain p-1" />
                      ) : (
                        <span className="grid size-full place-items-center bg-gray-100 text-[11px] font-bold text-gray-400">
                          {line.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold leading-snug text-ink-900">{line.name}</p>
                      {line.color && <p className="mt-0.5 text-[12px] text-gray-500">{line.color}</p>}
                      {line.ratingAvg != null && (
                        <p className="mt-1 flex items-center gap-1.5 text-[12px]">
                          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1 py-0.5 text-[10px] font-bold text-white">
                            {Number(line.ratingAvg).toFixed(1)} <Star className="size-2.5 fill-white" />
                          </span>
                          <span className="text-gray-500">({(line.ratingCount ?? 0).toLocaleString("en-IN")})</span>
                        </p>
                      )}
                      <p className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
                        {d > 0 && <span className="text-[13px] font-bold text-emerald-600">Ã¢â€ â€œ{d}%</span>}
                        {d > 0 && (
                          <span className="text-[12.5px] text-ink-300 line-through">{inr(line.mrp * line.quantity)}</span>
                        )}
                        <span className="text-[15px] font-bold text-ink-900">{inr(line.lineTotal)}</span>
                      </p>
                      {line.protectFee ? (
                        <p className="mt-1 text-[11.5px] text-gray-500">+ {inr(line.protectFee)} Protect Promise Fee</p>
                      ) : null}
                                          <div className="mt-2 flex flex-wrap items-center gap-3">
                      <QuantityStepper
                        value={line.quantity}
                        min={1}
                        max={Math.min(10, Math.max(1, line.stock))}
                        onChange={(v) => void setQty(line.productId, v)}
                      />
                      <button
                        type="button"
                        onClick={() => void remove(line.productId)}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-400 hover:text-flame-600"
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </button>
                    </div>
                      <p className="mt-2 text-[12.5px] font-semibold text-ink-700">Delivery by {deliveryDateLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="card space-y-5 p-5">
            <div>
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
                <Truck className="size-4 text-electric-600" />
                Delivery speed
              </h2>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <DeliveryOption
                  active={deliveryMode === "STANDARD"}
                  title="Standard"
                  body={`Free above Ã¢â€šÂ¹999 Ã‚Â· ${etaLabel}`}
                  onClick={() => setDeliveryMode("STANDARD")}
                />
                <DeliveryOption
                  active={deliveryMode === "EXPRESS"}
                  title="Express"
                  body="Priority dispatch Ã‚Â· faster metro delivery"
                  onClick={() => setDeliveryMode("EXPRESS")}
                />
              </div>
            </div>

            <div>
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
                <CreditCard className="size-4 text-electric-600" />
                Payment method
              </h2>

              {!razorpayKey && (
                <p className="mt-2 rounded-xl bg-amber-offer/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-amber-700">
                  Razorpay keys are not configured. Online methods are disabled in this environment.
                </p>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <PaymentOption
                  active={paymentMethod === "UPI"}
                  disabled={!razorpayKey}
                  title="UPI"
                  body="GPay, PhonePe, Paytm, BHIM"
                  onClick={() => setPaymentMethod("UPI")}
                />
                <PaymentOption
                  active={paymentMethod === "CARD"}
                  disabled={!razorpayKey}
                  title="Credit / Debit Card"
                  body="Secure Razorpay card flow"
                  onClick={() => setPaymentMethod("CARD")}
                />
                <PaymentOption
                  active={paymentMethod === "NETBANKING"}
                  disabled={!razorpayKey}
                  title="Net Banking"
                  body="Major Indian banks"
                  onClick={() => setPaymentMethod("NETBANKING")}
                />
                <PaymentOption
                  active={paymentMethod === "WALLET"}
                  disabled={!razorpayKey}
                  title="Wallet"
                  body="Paytm, Amazon Pay, PhonePe Wallet"
                  onClick={() => setPaymentMethod("WALLET")}
                />
                <PaymentOption
                  active={paymentMethod === "COD"}
                  disabled={!codAllowed}
                  title="Cash / UPI on Delivery"
                  body={codAllowed ? "Pay when your order arrives" : "Not eligible for all items"}
                  onClick={() => setPaymentMethod("COD")}
                />
              </div>
            </div>

            <Textarea
              label="Order note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Delivery instructions, gift note, installation timingÃ¢â‚¬Â¦"
              maxLength={300}
            />

            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="size-4" /> Back to order summary
              </Button>
            </div>
          </section>
        )}
      </div>

      <aside className="lg:sticky lg:top-[92px] lg:h-fit">
        <div className="card overflow-hidden">
          <header className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
            <h2 className="font-display text-[13px] font-bold uppercase tracking-wider text-ink-400">
              Price Details
            </h2>
            {quoteLoading && (
              <span className="inline-flex items-center gap-1 rounded-full bg-electric-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-electric-700">
                <Loader2 className="size-3 animate-spin" /> Updating
              </span>
            )}
          </header>

          <div className="space-y-0 p-4 text-[13px]">
            <div className="py-2.5">
              <Row k="MRP (incl. of all taxes)" v={inr(checkoutQuote.subtotalMrp)} />
            </div>

            <Collapsible title="Fees" value={inr(checkoutQuote.deliveryFee + checkoutQuote.codFee)}>
              <Row
                k="Delivery Charges"
                v={checkoutQuote.deliveryFee === 0 ? "FREE" : inr(checkoutQuote.deliveryFee)}
                good={checkoutQuote.deliveryFee === 0}
              />
              {checkoutQuote.codFee > 0 && <Row k="Cash on Delivery" v={inr(checkoutQuote.codFee)} />}
              {checkoutQuote.deliveryFee === 0 && checkoutQuote.codFee === 0 && (
                <p className="text-ink-400">No fees on this order.</p>
              )}
            </Collapsible>

            <Collapsible
              title="Discounts"
              value={`Ã¢Ë†â€™ ${inr(checkoutQuote.itemDiscount + (checkoutQuote.coupon?.discount ?? 0))}`}
              valueClass="text-emerald-600"
            >
              <Row k="Item Discounts" v={`Ã¢Ë†â€™ ${inr(checkoutQuote.itemDiscount)}`} good />
              {checkoutQuote.coupon && (
                <Row k={`Coupon ${checkoutQuote.coupon.code}`} v={`Ã¢Ë†â€™ ${inr(checkoutQuote.coupon.discount)}`} good />
              )}
            </Collapsible>

            <div className="my-1 border-t border-dashed border-hairline" />

            <div className="flex items-baseline justify-between py-2">
              <span className="font-display text-[15px] font-bold text-ink-900">Total Amount</span>
              <span className="font-display text-[17px] font-bold tabular-nums text-ink-900">
                {inr(checkoutQuote.total)}
              </span>
            </div>

            {checkoutQuote.savingsTotal > 0 && (
              <p className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] font-bold text-emerald-700">
                <Check className="size-3.5" /> You&apos;ll save {inr(checkoutQuote.savingsTotal)} on this order!
              </p>
            )}
          </div>

          {step >= 2 && (
            <div className="flex items-center justify-between gap-3 border-t border-hairline bg-white p-3">
              <div className="leading-tight">
                <p className="text-[12px] text-ink-300 line-through">{inr(checkoutQuote.subtotalMrp)}</p>
                <p className="flex items-center gap-1 text-[15px] font-bold text-ink-900">
                  {inr(checkoutQuote.total)}
                  <Info className="size-3.5 text-ink-400" />
                </p>
              </div>
              {step === 2 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="rounded-lg bg-[#ff9f00] px-8 py-3 text-[14px] font-bold text-ink-900 transition-all hover:brightness-105"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={placing || checkoutQuote.stockIssues.length > 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#ff9f00] px-6 py-3 text-[14px] font-bold text-ink-900 transition-all hover:brightness-105 disabled:opacity-50"
                >
                  {placing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                  Place order Ã‚Â· {inr(checkoutQuote.total)}
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function DeliveryOption({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3.5 text-left transition-colors",
        active ? "border-electric-500 bg-electric-50/50" : "border-hairline hover:border-electric-300",
      )}
    >
      <p className="text-[13.5px] font-bold text-ink-900">{title}</p>
      <p className="mt-1 text-[12.5px] text-ink-400">{body}</p>
    </button>
  );
}

function PaymentOption({
  active,
  disabled,
  title,
  body,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active ? "border-electric-500 bg-electric-50/50" : "border-hairline hover:border-electric-300",
      )}
    >
      <p className="text-[13.5px] font-bold text-ink-900">{title}</p>
      <p className="mt-1 text-[12.5px] text-ink-400">{body}</p>
    </button>
  );
}

function Collapsible({
  title,
  value,
  valueClass,
  children,
}: {
  title: string;
  value: string;
  valueClass?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-dashed border-hairline py-2.5 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[13px]"
      >
        <span className="flex items-center gap-1 font-medium text-ink-700">
          {title}
          <ChevronDown className={cn("size-3.5 text-ink-400 transition-transform", open && "rotate-180")} />
        </span>
        <span className={cn("font-semibold tabular-nums", valueClass ?? "text-ink-900")}>{value}</span>
      </button>
      {open && <div className="mt-2 space-y-1.5 pl-1">{children}</div>}
    </div>
  );
}

function Row({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-400">{k}</span>
      <span className={cn("font-semibold tabular-nums", good ? "text-emerald-600" : "text-ink-900")}>
        {v}
      </span>
    </div>
  );
}