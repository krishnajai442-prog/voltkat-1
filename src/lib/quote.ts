import prisma from "./prisma";
import { inspectPincode } from "./delivery";
import {
  businessDays,
  discountPercent,
  gstComponent,
} from "./utils";

export type QuoteLine = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  categorySlug: string;
  categoryName: string;
  image: string;
  mrp: number;
  salePrice: number;
  quantity: number;
  lineMrp: number;
  lineTotal: number;
  discountPercent: number;
  stock: number;
  inStock: boolean;
  emiEligible: boolean;
  exchangeEligible: boolean;
    codEligible: boolean;
  ratingAvg: number;
  ratingCount: number;
};
  
export type CouponResult = {
  couponId: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  discount: number;
};

export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotalMrp: number;
  subtotal: number;
  itemDiscount: number;
  coupon: CouponResult | null;
  couponError: string | null;
  deliveryFee: number;
  codFee: number;
  total: number;
  savingsTotal: number;
  gstComponent: number;
  deliveryMode: "STANDARD" | "EXPRESS";
  etaFrom: Date;
  etaTo: Date;
  stockIssues: {
    productId: string;
    name: string;
    requested: number;
    available: number;
  }[];
  couponApplicableSubtotal: number;
};

export type QuoteInput = {
  items: { productId: string; quantity: number }[];
  couponCode?: string | null;
  deliveryMode?: "STANDARD" | "EXPRESS";
  paymentMethod?: "UPI" | "CARD" | "NETBANKING" | "WALLET" | "COD";
  userId?: string | null;
  pincode?: string | null;
};

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_DELIVERY_FEE = 49;
const EXPRESS_DELIVERY_FEE = 99;
const COD_FEE = 49;
const GST_RATE = 18;

function imageFromProduct(images: { url: string; isPrimary: boolean }[], slug: string) {
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  return primary?.url ?? `https://picsum.photos/seed/${encodeURIComponent(slug)}/900/900`;
}

export async function computeQuote(input: QuoteInput): Promise<Quote> {
  const deliveryMode = input.deliveryMode ?? "STANDARD";
  const paymentMethod = input.paymentMethod ?? "UPI";
  const now = new Date();

  const requested = input.items.filter((i) => i.productId && i.quantity > 0);

  if (!requested.length) {
    return {
      lines: [],
      itemCount: 0,
      subtotalMrp: 0,
      subtotal: 0,
      itemDiscount: 0,
      coupon: null,
      couponError: null,
      deliveryFee: 0,
      codFee: 0,
      total: 0,
      savingsTotal: 0,
      gstComponent: 0,
      deliveryMode,
      etaFrom: businessDays(now, 3),
      etaTo: businessDays(now, 6),
      stockIssues: [],
      couponApplicableSubtotal: 0,
    };
  }

  const ids = Array.from(new Set(requested.map((i) => i.productId)));

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      name: true,
      mrp: true,
      salePrice: true,
      discountPercent: true,
      ratingAvg: true,
      ratingCount: true,
      stock: true,
      active: true,
      emiEligible: true,
      exchangeEligible: true,
      codEligible: true,
      category: { select: { slug: true, name: true } },
      brand: { select: { slug: true, name: true } },
      images: {
        select: { url: true, isPrimary: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const lines: QuoteLine[] = [];
  const stockIssues: Quote["stockIssues"] = [];

  for (const req of requested) {
    const p = productMap.get(req.productId);

    if (!p || !p.active) {
      stockIssues.push({
        productId: req.productId,
        name: "Unavailable product",
        requested: req.quantity,
        available: 0,
      });
      continue;
    }

    if (p.stock < req.quantity) {
      stockIssues.push({
        productId: p.id,
        name: p.name,
        requested: req.quantity,
        available: p.stock,
      });
    }

    lines.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand.name,
      brandSlug: p.brand.slug,
      categorySlug: p.category.slug,
      categoryName: p.category.name,
      image: imageFromProduct(p.images, p.slug),
      mrp: p.mrp,
      salePrice: p.salePrice,
      quantity: req.quantity,
      lineMrp: p.mrp * req.quantity,
      lineTotal: p.salePrice * req.quantity,
            discountPercent: p.discountPercent || discountPercent(p.mrp, p.salePrice),
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      stock: p.stock,
      inStock: p.stock > 0,
      emiEligible: p.emiEligible,
      exchangeEligible: p.exchangeEligible,
      codEligible: p.codEligible,
    });
  }

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotalMrp = lines.reduce((s, l) => s + l.lineMrp, 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const itemDiscount = subtotalMrp - subtotal;

  let coupon: CouponResult | null = null;
  let couponError: string | null = null;
  let couponApplicableSubtotal = subtotal;

  if (input.couponCode && lines.length) {
    const code = input.couponCode.trim().toUpperCase();

    const c = await prisma.coupon.findUnique({
      where: { code },
      include: {
        category: { select: { slug: true, name: true } },
        brand: { select: { slug: true, name: true } },
      },
    });

    if (!c) {
      couponError = "Coupon code not found.";
    } else if (!c.active) {
      couponError = "This coupon is no longer active.";
    } else if (c.startsAt > now) {
      couponError = "This coupon is not active yet.";
    } else if (c.endsAt && c.endsAt < now) {
      couponError = "This coupon has expired.";
    } else if (subtotal < c.minOrderValue) {
      couponError = `Minimum order value of ₹${c.minOrderValue.toLocaleString("en-IN")} required.`;
    } else if (c.usageLimit && c.usedCount >= c.usageLimit) {
      couponError = "This coupon has reached its usage limit.";
    } else {
      if (input.userId && c.perUserLimit) {
        const usedByUser = await prisma.couponRedemption.count({
          where: { couponId: c.id, userId: input.userId },
        });

        if (usedByUser >= c.perUserLimit) {
          couponError = "You have already used this coupon.";
        }
      }

      if (!couponError) {
        const applicableLines =
          c.scope === "ALL"
            ? lines
            : c.scope === "CATEGORY"
              ? lines.filter((l) => l.categorySlug === c.category?.slug)
              : lines.filter((l) => l.brandSlug === c.brand?.slug);

        couponApplicableSubtotal = applicableLines.reduce((s, l) => s + l.lineTotal, 0);

        if (couponApplicableSubtotal <= 0) {
          couponError =
            c.scope === "ALL"
              ? "Coupon not applicable to this cart."
              : `Coupon applies only to ${c.category?.name ?? c.brand?.name ?? "selected products"}.`;
        } else {
          let discount =
            c.type === "PERCENT"
              ? Math.round((couponApplicableSubtotal * c.value) / 100)
              : c.value;

          if (c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
          discount = Math.min(discount, couponApplicableSubtotal);

          coupon = {
            couponId: c.id,
            code: c.code,
            description: c.description,
            type: c.type,
            value: c.value,
            discount,
          };
        }
      }
    }
  }

  const couponDiscount = coupon?.discount ?? 0;
  const payableAfterCoupon = Math.max(0, subtotal - couponDiscount);

  const deliveryFee =
    lines.length === 0
      ? 0
      : deliveryMode === "EXPRESS"
        ? EXPRESS_DELIVERY_FEE
        : payableAfterCoupon >= FREE_SHIPPING_THRESHOLD
          ? 0
          : STANDARD_DELIVERY_FEE;

  const codFee =
    paymentMethod === "COD" && lines.length > 0 && lines.every((l) => l.codEligible)
      ? COD_FEE
      : 0;

  const total = payableAfterCoupon + deliveryFee + codFee;

  let etaFrom = businessDays(now, deliveryMode === "EXPRESS" ? 1 : 3);
  let etaTo = businessDays(now, deliveryMode === "EXPRESS" ? 2 : 6);

      if (input.pincode) {
      const inspection = await inspectPincode(input.pincode); // ✅ Awaited
            if (inspection.serviceable) {
        // etaFrom/etaTo are Date here (from businessDays above); inspection
        // returns ISO strings that may be null -> coerce + keep prior value on null.
        if (inspection.etaFrom) etaFrom = new Date(inspection.etaFrom);
        if (inspection.etaTo)   etaTo   = new Date(inspection.etaTo);
      }
    }
  return {
    lines,
    itemCount,
    subtotalMrp,
    subtotal,
    itemDiscount,
    coupon,
    couponError,
    deliveryFee,
    codFee,
    total,
    savingsTotal: itemDiscount + couponDiscount,
    gstComponent: gstComponent(total, GST_RATE),
    deliveryMode,
    etaFrom,
    etaTo,
    stockIssues,
    couponApplicableSubtotal,
  };
}