import { z } from "zod";

const MOBILE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^[1-9]\d{5}$/;

export const email = z.string().trim().email("Enter a valid email").toLowerCase();

export const mobile = z
  .string()
  .trim()
  .regex(MOBILE_RE, "Enter a valid 10-digit Indian mobile number");

export const optionalMobile = z
  .union([mobile, z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const pincode = z
  .string()
  .trim()
  .regex(PINCODE_RE, "Enter a valid 6-digit Indian PIN code");

export const nonNegInt = z.coerce.number().int().min(0);
export const positiveInt = z.coerce.number().int().min(1);

export const booleanParam = z.preprocess((v) => {
  if (v === "true" || v === true) return true;
  if (v === "false" || v === false) return false;
  return undefined;
}, z.boolean().optional());

export const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 10 characters",
    test: (v: string) => v.length >= 10,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    id: "lower",
    label: "One lowercase letter",
    test: (v: string) => /[a-z]/.test(v),
  },
  {
    id: "number",
    label: "One number",
    test: (v: string) => /\d/.test(v),
  },
  {
    id: "special",
    label: "One special character",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

export const password = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .superRefine((v, ctx) => {
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: rule.label,
        });
      }
    }
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
  admin: z.coerce.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email,
  phone: optionalMobile,
  password,
  whatsappOptIn: z.coerce.boolean().optional(),
  honeypot: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Invalid reset token"),
  password,
});

export const addressSchema = z.object({
  label: z.string().trim().max(40).default("Home"),
  fullName: z.string().trim().min(2, "Full name is required").max(80),
  phone: mobile,
  altPhone: optionalMobile,
  pincode,
    line1: z.string().trim().min(2, "Address line must be at least 2 characters").max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().min(2, "State is required").max(80),
  isDefault: z.coerce.boolean().optional(),
});

export const quoteSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(10),
      }),
    )
    .min(1, "Cart is empty")
    .max(50),
  couponCode: z.string().trim().max(24).optional().nullable(),
  deliveryMode: z.enum(["STANDARD", "EXPRESS"]).optional(),
  paymentMethod: z
    .enum(["UPI", "CARD", "NETBANKING", "WALLET", "COD"])
    .optional(),
  pincode: z.string().trim().max(6).optional().nullable(),
});

export const orderCreateSchema = quoteSchema.extend({
  addressId: z.string().optional(),
  address: addressSchema.optional(),
  guestEmail: email.optional().or(z.literal("")),
  guestPhone: optionalMobile,
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const returnSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.enum([
    "DAMAGED",
    "WRONG_PRODUCT",
    "NOT_WORKING",
    "MISSING_ACCESSORY",
    "OTHER",
  ]),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
  resolution: z.enum(["REFUND", "REPLACEMENT"]).default("REFUND"),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().min(15, "Review is too short").max(2000),
  images: z.array(z.string().trim().max(1000)).max(5).optional(),
});

export const questionSchema = z.object({
  productId: z.string().min(1),
  body: z.string().trim().min(5, "Question is too short").max(500),
});

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(4, "Subject is too short").max(120),
  category: z
    .enum(["ORDER", "PAYMENT", "PRODUCT", "RETURN", "ACCOUNT", "GENERAL"])
    .default("GENERAL"),
  orderId: z.string().optional().or(z.literal("")),
  message: z.string().trim().min(10, "Message is too short").max(2000),
});

export const supportReplySchema = z.object({
  body: z.string().trim().min(2, "Reply is too short").max(2000),
  status: z
    .enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"])
    .optional(),
});

export const newsletterSchema = z.object({
  email,
  phone: optionalMobile,
  whatsappOptIn: z.coerce.boolean().optional(),
  honeypot: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email,
  phone: optionalMobile,
  topic: z
    .enum(["SALES", "SUPPORT", "PARTNERSHIP", "PRESS", "OTHER"])
    .default("SUPPORT"),
  message: z.string().trim().min(10, "Message is too short").max(2000),
  honeypot: z.string().optional(),
});

export const trackLookupSchema = z.object({
  orderNumber: z.string().trim().min(5).max(40),
  identifier: z.string().trim().min(5).max(120),
});

export const stockAdjustSchema = z.object({
  delta: z.coerce.number().int().min(-100000).max(100000),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(3).max(180),
  slug: z.string().trim().max(180).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(240).optional().or(z.literal("")),
  categoryId: z.string().min(1),
  brandId: z.string().min(1),
  mrp: positiveInt.max(10000000),
  salePrice: positiveInt.max(10000000),
  stock: nonNegInt.max(1000000),
  lowStockAt: nonNegInt.max(100000).default(5),
  subtype: z.string().trim().max(80).optional().or(z.literal("")),
  ram: z.string().trim().max(40).optional().or(z.literal("")),
  storage: z.string().trim().max(40).optional().or(z.literal("")),
  screenSize: z.string().trim().max(40).optional().or(z.literal("")),
  processor: z.string().trim().max(80).optional().or(z.literal("")),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  warrantyMonths: nonNegInt.max(120).default(12),
  returnableDays: nonNegInt.max(30).default(7),
  codEligible: z.coerce.boolean().default(true),
  emiEligible: z.coerce.boolean().default(true),
  exchangeEligible: z.coerce.boolean().default(true),
  featured: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
  hsnCode: z.string().trim().max(20).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(3).max(1000),
        alt: z.string().trim().max(160).optional().or(z.literal("")),
      }),
    )
    .min(1)
    .max(50),
  specifications: z
    .array(
      z.object({
        group: z.string().trim().min(1).max(60),
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(240),
      }),
    )
    .max(120)
    .default([]),
});

export const couponInputSchema = z
  .object({
    id: z.string().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,24}$/, "3–24 letters/numbers"),
    description: z.string().trim().max(200).optional().or(z.literal("")),
    type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
    value: z.coerce.number().int().min(1).max(200000),
    scope: z.enum(["ALL", "CATEGORY", "BRAND"]).default("ALL"),
    categoryId: z.string().optional().or(z.literal("")),
    brandId: z.string().optional().or(z.literal("")),
    minOrderValue: nonNegInt.default(0),
    maxDiscount: z.coerce.number().int().min(0).max(200000).optional(),
    usageLimit: z.coerce.number().int().min(0).max(1000000).optional(),
    perUserLimit: z.coerce.number().int().min(1).max(100).default(1),
    active: z.coerce.boolean().default(true),
    startsAt: z.string().optional().or(z.literal("")),
    endsAt: z.string().optional().or(z.literal("")),
    broadcast: z.coerce.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PERCENT" && data.value > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Percentage coupon value must be 90 or lower",
      });
    }
    if (data.scope === "CATEGORY" && !data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryId"],
        message: "Category is required for category-scoped coupons",
      });
    }
    if (data.scope === "BRAND" && !data.brandId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["brandId"],
        message: "Brand is required for brand-scoped coupons",
      });
    }
  });

export const bannerInputSchema = z.object({
  slot: z.enum(["HERO_TEXT", "PROMO_STRIP", "CATEGORY", "SALE", "FOOTER"]),
  title: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(240).optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  ctaHref: z.string().trim().max(200).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  active: z.coerce.boolean().default(true),
  sortOrder: nonNegInt.default(0),
});

export const slideInputSchema = z.object({
  badge: z.string().trim().min(2).max(60),
  headline: z.string().trim().min(5).max(120),
  // nullish() = optional + nullable: edit-load puts JSON null into empty text
  // columns, and "" is already a valid string, so .or(z.literal("")) was pointless.
  highlight: z.string().trim().max(80).nullish(),
  description: z.string().trim().max(300).nullish(),
  ctaLabel: z.string().trim().min(2).max(40).default("Shop Now"),
  ctaHref: z.string().trim().max(200).nullish(),
  secondaryLabel: z.string().trim().max(40).nullish(),
  secondaryHref: z.string().trim().max(200).nullish(),
  image: z.string().trim().max(1000).nullish(),
  // NOT a hardcoded enum: the real GradientTheme values live in SLIDE_GRADIENTS /
  // the schema (EMERALD_TECH, STEEL_GRAPHITE, …). A guessed list here is what made
  // every themed-slide edit fail with "Invalid input". The DB enum still rejects typos.
  gradient: z.string().trim().min(1),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).default(0),
  startsAt: z.string().nullish(),
  endsAt: z.string().nullish(),
  productIds: z.array(z.string()).max(3).default([]),
  // Per-attached-product slide artwork: { [productId]: url }
  productImages: z.record(z.string(), z.string().trim().max(1000).or(z.literal(""))).default({}),
});

export const featureInputSchema = z.object({
    section: z.enum(["NEW_ARRIVALS", "HOT_DEALS", "TRENDING", "BEST_SELLERS", "WISHLIST"]),
  productIds: z.array(z.string().min(1)).max(24).default([]),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
  carrier: z.string().trim().max(120).optional().or(z.literal("")),
  trackingNumber: z.string().trim().max(120).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits").optional(), // <-- add
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().optional(),
  sort: z
    .enum(["popular", "newest", "priceLow", "priceHigh", "discount", "rating"])
    .default("popular"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(48).default(24),
  brands: z.string().trim().optional(),
  subtypes: z.string().trim().optional(),
  ram: z.string().trim().optional(),
  storage: z.string().trim().optional(),
  screenSize: z.string().trim().optional(),
  processor: z.string().trim().optional(),
  color: z.string().trim().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minDiscount: z.coerce.number().int().min(0).max(100).optional(),
  inStock: booleanParam,
  warranty: z.coerce.number().int().min(0).optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: optionalMobile,
  whatsappOptIn: z.coerce.boolean().optional(),
  marketingOptIn: z.coerce.boolean().optional(),
});

export const returnDecisionSchema = z.object({
  status: z.enum([
    "APPROVED",
    "REJECTED",
    "PICKED_UP",
    "REPLACED",
    "REFUNDED",
    "CLOSED",
  ]),
  adminNote: z.string().trim().max(600).optional().or(z.literal("")),
});