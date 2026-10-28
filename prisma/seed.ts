import {
  CouponScope,
  CouponType,
  FeatureSection,
  GradientTheme,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  ReturnReason,
  ReturnStatus,
  Role,
  TicketStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/* ───────────────────────── helpers ───────────────────────── */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function img(seed: string, size = 900): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${size}/${size}`;
}

function discount(mrp: number, sale: number): number {
  if (mrp <= 0 || sale >= mrp) return 0;
  return Math.round(((mrp - sale) / mrp) * 100);
}

function gstComponent(gross: number, rate = 18): number {
  return Math.round(gross - gross / (1 + rate / 100));
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86400000);
}

type SeedProduct = {
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  brand: string;
  mrp: number;
  salePrice: number;
  stock: number;
  lowStockAt?: number;
  ratingAvg?: number;
  ratingCount?: number;
  sold?: number;
  featured?: boolean;
  subtype?: string;
  ram?: string;
  storage?: string;
  screenSize?: string;
  processor?: string;
  color?: string;
  warrantyMonths?: number;
  returnableDays?: number;
  hsnCode?: string;
  tags?: string[];
  specs: [string, string, string][];
};

function makeDescription(name: string, shortDescription: string, returnableDays = 7) {
  return `${name} is listed at VoltKart with 100% genuine stock, GST invoice and brand warranty support. ${shortDescription} Shop with secure UPI/card payments, no-cost EMI options where eligible, exchange assistance and a ${returnableDays}-day replacement window for damaged or wrong deliveries.`;
}

async function getOrCreateOrder(orderNumber: string, factory: () => Promise<any>) {
  const existing = await prisma.order.findUnique({ where: { orderNumber } });
  if (existing) return existing;
  return factory();
}

/* ───────────────────────── catalog ───────────────────────── */

const categories = [
  {
    slug: "mobiles",
    name: "Mobiles",
    description: "Smartphones, tablets and feature phones from authorised distribution.",
    icon: "Smartphone",
    sortOrder: 1,
  },
  {
    slug: "laptops",
    name: "Laptops",
    description: "Ultrabooks, business notebooks, creator rigs and gaming laptops.",
    icon: "Laptop",
    sortOrder: 2,
  },
  {
    slug: "home-appliances",
    name: "Home Appliances",
    description: "Cooling, laundry, kitchen and entertainment appliances for Indian homes.",
    icon: "Refrigerator",
    sortOrder: 3,
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Audio, charging, peripherals, protection and daily-use add-ons.",
    icon: "Headphones",
    sortOrder: 4,
  },
];

const brands = [
  { slug: "apple", name: "Apple", countryCode: "US" },
  { slug: "samsung", name: "Samsung", countryCode: "KR" },
  { slug: "oneplus", name: "OnePlus", countryCode: "CN" },
  { slug: "google", name: "Google", countryCode: "US" },
  { slug: "xiaomi", name: "Xiaomi", countryCode: "CN" },
  { slug: "realme", name: "Realme", countryCode: "CN" },
  { slug: "dell", name: "Dell", countryCode: "US" },
  { slug: "hp", name: "HP", countryCode: "US" },
  { slug: "lenovo", name: "Lenovo", countryCode: "CN" },
  { slug: "asus", name: "ASUS", countryCode: "TW" },
  { slug: "lg", name: "LG", countryCode: "KR" },
  { slug: "whirlpool", name: "Whirlpool", countryCode: "US" },
  { slug: "bosch", name: "Bosch", countryCode: "DE" },
  { slug: "sony", name: "Sony", countryCode: "JP" },
  { slug: "boat", name: "boAt", countryCode: "IN" },
  { slug: "anker", name: "Anker", countryCode: "CN" },
  { slug: "ugreen", name: "Ugreen", countryCode: "CN" },
  { slug: "preethi", name: "Preethi", countryCode: "IN" },
];

const products: SeedProduct[] = [
  {
    slug: "apple-iphone-16-pro-256gb-desert-titanium",
    name: "Apple iPhone 16 Pro (256GB, Desert Titanium)",
    shortDescription: "A18 Pro chip, 48MP Pro camera system, titanium design and all-day battery.",
    category: "mobiles",
    brand: "apple",
    mrp: 139900,
    salePrice: 129900,
    stock: 18,
    ratingAvg: 4.7,
    ratingCount: 214,
    sold: 132,
    featured: true,
    subtype: "Smartphone",
    ram: "8 GB",
    storage: "256 GB",
    screenSize: "6.3 inch",
    processor: "A18 Pro",
    color: "Desert Titanium",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85171390",
    tags: ["5g", "iphone", "titanium", "camera", "ios"],
    specs: [
      ["Display", "Type", "Super Retina XDR OLED"],
      ["Display", "Refresh rate", "120Hz ProMotion"],
      ["Camera", "Rear", "48MP main + 48MP ultrawide + 12MP telephoto"],
      ["Battery", "Video playback", "Up to 27 hours"],
      ["Build", "Material", "Grade 5 titanium"],
      ["Network", "SIM", "Dual eSIM"],
    ],
  },
  {
    slug: "samsung-galaxy-s25-ultra-512gb-titanium-black",
    name: "Samsung Galaxy S25 Ultra (512GB, Titanium Black)",
    shortDescription: "200MP camera, Snapdragon 8 Elite, S Pen and 7 years of OS updates.",
    category: "mobiles",
    brand: "samsung",
    mrp: 144999,
    salePrice: 129999,
    stock: 14,
    ratingAvg: 4.6,
    ratingCount: 188,
    sold: 96,
    featured: true,
    subtype: "Smartphone",
    ram: "12 GB",
    storage: "512 GB",
    screenSize: "6.9 inch",
    processor: "Snapdragon 8 Elite",
    color: "Titanium Black",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85171390",
    tags: ["5g", "android", "s-pen", "camera", "flagship"],
    specs: [
      ["Display", "Type", "Dynamic AMOLED 2X"],
      ["Camera", "Rear", "200MP + 50MP + 10MP + 12MP"],
      ["Battery", "Capacity", "5000 mAh"],
      ["Charging", "Wired", "45W fast charging"],
      ["Software", "Updates", "7 years OS + security"],
    ],
  },
  {
    slug: "oneplus-13-16gb-512gb-black-obsidian",
    name: "OnePlus 13 (16GB RAM, 512GB, Black Obsidian)",
    shortDescription: "Snapdragon 8 Elite, 6000mAh battery and 100W SUPERVOOC charging.",
    category: "mobiles",
    brand: "oneplus",
    mrp: 69999,
    salePrice: 64999,
    stock: 26,
    ratingAvg: 4.5,
    ratingCount: 142,
    sold: 118,
    subtype: "Smartphone",
    ram: "16 GB",
    storage: "512 GB",
    screenSize: "6.82 inch",
    processor: "Snapdragon 8 Elite",
    color: "Black Obsidian",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85171390",
    tags: ["5g", "android", "fast-charging", "oxygenos"],
    specs: [
      ["Display", "Type", "LTPO AMOLED"],
      ["Battery", "Capacity", "6000 mAh"],
      ["Charging", "Wired", "100W SUPERVOOC"],
      ["Camera", "Rear", "50MP triple Hasselblad"],
    ],
  },
  {
    slug: "google-pixel-9-pro-256gb-obsidian",
    name: "Google Pixel 9 Pro (256GB, Obsidian)",
    shortDescription: "Tensor G4, best-in-class computational photography and clean Android.",
    category: "mobiles",
    brand: "google",
    mrp: 106999,
    salePrice: 99999,
    stock: 12,
    ratingAvg: 4.6,
    ratingCount: 96,
    sold: 64,
    subtype: "Smartphone",
    ram: "16 GB",
    storage: "256 GB",
    screenSize: "6.3 inch",
    processor: "Tensor G4",
    color: "Obsidian",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85171390",
    tags: ["5g", "android", "pixel", "camera", "ai"],
    specs: [
      ["Display", "Type", "Actua OLED"],
      ["Camera", "Rear", "50MP + 48MP + 48MP"],
      ["Software", "Updates", "7 years"],
      ["Battery", "Capacity", "5060 mAh"],
    ],
  },
  {
    slug: "apple-iphone-16-128gb-ultramarine",
    name: "Apple iPhone 16 (128GB, Ultramarine)",
    shortDescription: "A18 chip, Camera Control, action mode and excellent everyday performance.",
    category: "mobiles",
    brand: "apple",
    mrp: 79900,
    salePrice: 72900,
    stock: 34,
    ratingAvg: 4.5,
    ratingCount: 176,
    sold: 154,
    subtype: "Smartphone",
    ram: "8 GB",
    storage: "128 GB",
    screenSize: "6.1 inch",
    processor: "A18",
    color: "Ultramarine",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85171390",
    tags: ["5g", "iphone", "ios", "compact"],
    specs: [
      ["Display", "Type", "Super Retina XDR"],
      ["Camera", "Rear", "48MP + 12MP ultrawide"],
      ["Battery", "Video playback", "Up to 22 hours"],
    ],
  },
  {
    slug: "samsung-galaxy-a56-5g-8gb-128gb-blue",
    name: "Samsung Galaxy A56 5G (8GB, 128GB, Blue)",
    shortDescription: "Value 5G phone with Super AMOLED display and long software support.",
    category: "mobiles",
    brand: "samsung",
    mrp: 31999,
    salePrice: 27999,
    stock: 48,
    ratingAvg: 4.3,
    ratingCount: 221,
    sold: 198,
    subtype: "Smartphone",
    ram: "8 GB",
    storage: "128 GB",
    screenSize: "6.7 inch",
    processor: "Exynos 1580",
    color: "Blue",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85171390",
    tags: ["5g", "android", "budget", "amoled"],
    specs: [
      ["Display", "Type", "Super AMOLED"],
      ["Battery", "Capacity", "5000 mAh"],
      ["Camera", "Rear", "50MP OIS"],
    ],
  },
  {
    slug: "redmi-note-14-pro-5g-8gb-256gb",
    name: "Redmi Note 14 Pro 5G (8GB, 256GB)",
    shortDescription: "200MP camera, 120Hz AMOLED and 6200mAh battery at a sharp price.",
    category: "mobiles",
    brand: "xiaomi",
    mrp: 23999,
    salePrice: 20999,
    stock: 55,
    ratingAvg: 4.2,
    ratingCount: 304,
    sold: 267,
    subtype: "Smartphone",
    ram: "8 GB",
    storage: "256 GB",
    screenSize: "6.67 inch",
    processor: "Dimensity 7300 Ultra",
    color: "Midnight Black",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85171390",
    tags: ["5g", "android", "value", "camera"],
    specs: [
      ["Display", "Type", "CrystalRes AMOLED"],
      ["Battery", "Capacity", "6200 mAh"],
      ["Charging", "Wired", "45W"],
    ],
  },
  {
    slug: "apple-ipad-air-11-m3-128gb-space-grey",
    name: "Apple iPad Air 11-inch (M3, 128GB, Space Grey)",
    shortDescription: "M3 performance, Apple Intelligence support and ultra-light tablet design.",
    category: "mobiles",
    brand: "apple",
    mrp: 69900,
    salePrice: 64900,
    stock: 16,
    ratingAvg: 4.7,
    ratingCount: 88,
    sold: 54,
    subtype: "Tablet",
    ram: "8 GB",
    storage: "128 GB",
    screenSize: "11 inch",
    processor: "Apple M3",
    color: "Space Grey",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85171390",
    tags: ["tablet", "ipad", "m3", "creator"],
    specs: [
      ["Display", "Type", "Liquid Retina"],
      ["Chip", "Processor", "Apple M3"],
      ["Camera", "Rear", "12MP wide"],
    ],
  },

  {
    slug: "apple-macbook-air-13-m3-16gb-512gb-midnight",
    name: "Apple MacBook Air 13-inch (M3, 16GB, 512GB, Midnight)",
    shortDescription: "Fanless M3 laptop with all-day battery and a gorgeous Liquid Retina display.",
    category: "laptops",
    brand: "apple",
    mrp: 114900,
    salePrice: 104900,
    stock: 15,
    ratingAvg: 4.8,
    ratingCount: 132,
    sold: 91,
    featured: true,
    subtype: "Ultrabook",
    ram: "16 GB",
    storage: "512 GB",
    screenSize: "13.6 inch",
    processor: "Apple M3",
    color: "Midnight",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84713090",
    tags: ["macbook", "ultrabook", "m3", "creator"],
    specs: [
      ["Display", "Type", "Liquid Retina"],
      ["Battery", "Video playback", "Up to 18 hours"],
      ["Ports", "Thunderbolt", "2x Thunderbolt 4"],
      ["Weight", "Approx", "1.24 kg"],
    ],
  },
  {
    slug: "dell-xps-13-9350-core-ultra-7-16gb-512gb",
    name: "Dell XPS 13 (Core Ultra 7, 16GB, 512GB)",
    shortDescription: "Premium Windows ultrabook with InfinityEdge display and excellent build.",
    category: "laptops",
    brand: "dell",
    mrp: 139990,
    salePrice: 124990,
    stock: 10,
    ratingAvg: 4.5,
    ratingCount: 74,
    sold: 42,
    subtype: "Ultrabook",
    ram: "16 GB",
    storage: "512 GB",
    screenSize: "13.4 inch",
    processor: "Intel Core Ultra 7",
    color: "Graphite",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84713090",
    tags: ["windows", "ultrabook", "intel", "premium"],
    specs: [
      ["Display", "Type", "OLED option"],
      ["Battery", "Capacity", "55 Wh"],
      ["Weight", "Approx", "1.19 kg"],
    ],
  },
  {
    slug: "hp-pavilion-14-core-i5-13th-16gb-512gb",
    name: "HP Pavilion 14 (Core i5 13th Gen, 16GB, 512GB)",
    shortDescription: "Balanced everyday laptop for work, study and light creation.",
    category: "laptops",
    brand: "hp",
    mrp: 74990,
    salePrice: 64990,
    stock: 24,
    ratingAvg: 4.3,
    ratingCount: 156,
    sold: 128,
    subtype: "Business",
    ram: "16 GB",
    storage: "512 GB",
    screenSize: "14 inch",
    processor: "Intel Core i5-1335U",
    color: "Natural Silver",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84713090",
    tags: ["windows", "business", "intel", "value"],
    specs: [
      ["Display", "Type", "IPS anti-glare"],
      ["Battery", "Fast charge", "50% in 45 min"],
      ["Audio", "Tuning", "B&O"],
    ],
  },
  {
    slug: "lenovo-thinkpad-e14-gen-5-ryzen-5",
    name: "Lenovo ThinkPad E14 Gen 5 (Ryzen 5, 16GB, 512GB)",
    shortDescription: "Business-grade keyboard, durability and serviceability in a value chassis.",
    category: "laptops",
    brand: "lenovo",
    mrp: 72990,
    salePrice: 62990,
    stock: 21,
    ratingAvg: 4.4,
    ratingCount: 103,
    sold: 87,
    subtype: "Business",
    ram: "16 GB",
    storage: "512 GB",
    screenSize: "14 inch",
    processor: "AMD Ryzen 5 7530U",
    color: "Black",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84713090",
    tags: ["thinkpad", "business", "amd", "durable"],
    specs: [
      ["Keyboard", "Type", "ThinkPad spill-resistant"],
      ["Security", "TPM", "Discrete TPM 2.0"],
      ["Ports", "USB", "USB-C, USB-A, HDMI"],
    ],
  },
  {
    slug: "asus-rog-strix-g16-rtx-5070-i9-32gb-1tb",
    name: "ASUS ROG Strix G16 (RTX 5070, i9, 32GB, 1TB)",
    shortDescription: "High-refresh gaming laptop with strong thermals and creator-grade display.",
    category: "laptops",
    brand: "asus",
    mrp: 219990,
    salePrice: 194990,
    stock: 7,
    lowStockAt: 5,
    ratingAvg: 4.6,
    ratingCount: 61,
    sold: 33,
    featured: true,
    subtype: "Gaming",
    ram: "32 GB",
    storage: "1 TB",
    screenSize: "16 inch",
    processor: "Intel Core i9-14900HX",
    color: "Eclipse Gray",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84713090",
    tags: ["gaming", "rtx", "intel", "165hz"],
    specs: [
      ["GPU", "Model", "NVIDIA GeForce RTX 5070"],
      ["Display", "Refresh", "165Hz QHD"],
      ["Cooling", "System", "ROG Intelligent Cooling"],
    ],
  },
  {
    slug: "hp-victus-15-rtx-4050-i5",
    name: "HP Victus 15 (RTX 4050, Core i5, 16GB, 512GB)",
    shortDescription: "Entry gaming laptop that also handles editing and multitasking well.",
    category: "laptops",
    brand: "hp",
    mrp: 94990,
    salePrice: 84990,
    stock: 13,
    ratingAvg: 4.2,
    ratingCount: 94,
    sold: 68,
    subtype: "Gaming",
    ram: "16 GB",
    storage: "512 GB",
    screenSize: "15.6 inch",
    processor: "Intel Core i5-13420H",
    color: "Mica Silver",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84713090",
    tags: ["gaming", "rtx", "budget", "intel"],
    specs: [
      ["GPU", "Model", "NVIDIA GeForce RTX 4050"],
      ["Display", "Refresh", "144Hz FHD"],
      ["Battery", "Capacity", "70 Wh"],
    ],
  },

  {
    slug: "samsung-1-5-ton-3-star-inverter-split-ac",
    name: "Samsung 1.5 Ton 3 Star Inverter Split AC",
    shortDescription: "Fast cooling, copper condenser and energy-efficient inverter compressor.",
    category: "home-appliances",
    brand: "samsung",
    mrp: 45990,
    salePrice: 36990,
    stock: 19,
    ratingAvg: 4.3,
    ratingCount: 188,
    sold: 112,
    subtype: "Air Conditioner",
    color: "White",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84151090",
    tags: ["ac", "inverter", "copper", "energy-saving"],
    specs: [
      ["Capacity", "Tonnes", "1.5"],
      ["Star rating", "BEE", "3 Star"],
      ["Condenser", "Material", "Copper"],
      ["Warranty", "Compressor", "10 years"],
    ],
  },
  {
    slug: "lg-260l-3-star-double-door-refrigerator",
    name: "LG 260L 3 Star Double Door Refrigerator",
    shortDescription: "Smart Inverter compressor, hygienic fresh zone and stable temperature.",
    category: "home-appliances",
    brand: "lg",
    mrp: 32990,
    salePrice: 27990,
    stock: 17,
    ratingAvg: 4.4,
    ratingCount: 164,
    sold: 101,
    subtype: "Refrigerator",
    color: "Matte Steel",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84181000",
    tags: ["refrigerator", "double-door", "inverter"],
    specs: [
      ["Capacity", "Litres", "260"],
      ["Compressor", "Type", "Smart Inverter"],
      ["Warranty", "Compressor", "10 years"],
    ],
  },
  {
    slug: "bosch-7kg-frontend-washing-machine",
    name: "Bosch 7kg Front Load Washing Machine",
    shortDescription: "Efficient drum cleaning, anti-vibration design and gentle fabric care.",
    category: "home-appliances",
    brand: "bosch",
    mrp: 34990,
    salePrice: 29990,
    stock: 12,
    ratingAvg: 4.5,
    ratingCount: 119,
    sold: 76,
    subtype: "Washing Machine",
    color: "White",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84501100",
    tags: ["washing-machine", "front-load", "bosch"],
    specs: [
      ["Capacity", "Kg", "7"],
      ["Motor", "Type", "EcoSilence Drive"],
      ["Warranty", "Motor", "10 years"],
    ],
  },
  {
    slug: "sony-bravia-55-inch-4k-google-tv",
    name: "Sony Bravia 55-inch 4K Google TV",
    shortDescription: "Cognitive processor XR, vivid colour and premium smart TV experience.",
    category: "home-appliances",
    brand: "sony",
    mrp: 84990,
    salePrice: 69990,
    stock: 9,
    ratingAvg: 4.6,
    ratingCount: 87,
    sold: 52,
    subtype: "Television",
    color: "Black",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85285200",
    tags: ["tv", "4k", "google-tv", "sony"],
    specs: [
      ["Display", "Size", "55 inch"],
      ["Resolution", "Type", "4K UHD"],
      ["Processor", "Model", "Cognitive Processor XR"],
    ],
  },
  {
    slug: "whirlpool-28l-convection-microwave",
    name: "Whirlpool 28L Convection Microwave Oven",
    shortDescription: "Bake, grill and reheat with Indian cook presets and easy clean cavity.",
    category: "home-appliances",
    brand: "whirlpool",
    mrp: 13990,
    salePrice: 10990,
    stock: 23,
    ratingAvg: 4.2,
    ratingCount: 143,
    sold: 98,
    subtype: "Microwave",
    color: "Silver",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85165000",
    tags: ["microwave", "convection", "kitchen"],
    specs: [
      ["Capacity", "Litres", "28"],
      ["Modes", "Types", "Convection, grill, microwave"],
      ["Cavity", "Material", "Stainless steel"],
    ],
  },
  {
    slug: "preethi-mixer-grinder-750w-blue-leaf",
    name: "Preethi Mixer Grinder 750W (Blue Leaf)",
    shortDescription: "Powerful motor, stainless steel jars and overload protection for daily use.",
    category: "home-appliances",
    brand: "preethi",
    mrp: 4490,
    salePrice: 3490,
    stock: 41,
    ratingAvg: 4.3,
    ratingCount: 267,
    sold: 211,
    subtype: "Mixer Grinder",
    color: "Blue",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85094000",
    tags: ["kitchen", "mixer", "indian-cooking"],
    specs: [
      ["Power", "Wattage", "750 W"],
      ["Jars", "Count", "3 stainless steel"],
      ["Protection", "Feature", "Overload protector"],
    ],
  },

  {
    slug: "boat-rockerz-450-anc-tws",
    name: "boAt Rockerz 450 ANC TWS Earbuds",
    shortDescription: "Active noise cancellation, low-latency mode and compact charging case.",
    category: "accessories",
    brand: "boat",
    mrp: 3990,
    salePrice: 1999,
    stock: 88,
    ratingAvg: 4.1,
    ratingCount: 512,
    sold: 429,
    featured: true,
    subtype: "Earphones",
    color: "Carbon Black",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85183000",
    tags: ["audio", "anc", "tws", "budget"],
    specs: [
      ["Driver", "Size", "10mm dynamic"],
      ["Battery", "Playback", "Up to 30 hours with case"],
      ["Codec", "Support", "SBC, AAC"],
    ],
  },
  {
    slug: "anker-powercore-20000mah-22-5w",
    name: "Anker PowerCore 20000mAh 22.5W Power Bank",
    shortDescription: "High-capacity backup with dual output and rechargeable laptop-friendly ports.",
    category: "accessories",
    brand: "anker",
    mrp: 3499,
    salePrice: 2499,
    stock: 64,
    ratingAvg: 4.5,
    ratingCount: 338,
    sold: 274,
    subtype: "Power Bank",
    color: "Black",
    warrantyMonths: 18,
    returnableDays: 7,
    hsnCode: "85076000",
    tags: ["charging", "power-bank", "travel"],
    specs: [
      ["Capacity", "mAh", "20000"],
      ["Output", "Max", "22.5W"],
      ["Ports", "Count", "USB-C + USB-A"],
    ],
  },
  {
    slug: "apple-usb-c-20w-charger",
    name: "Apple 20W USB-C Power Adapter",
    shortDescription: "Genuine fast charging adapter for iPhone, iPad and Apple Watch.",
    category: "accessories",
    brand: "apple",
    mrp: 1990,
    salePrice: 1690,
    stock: 120,
    ratingAvg: 4.4,
    ratingCount: 421,
    sold: 365,
    subtype: "Charger",
    color: "White",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "85044090",
    tags: ["charger", "usb-c", "iphone", "genuine"],
    specs: [
      ["Output", "Wattage", "20W"],
      ["Port", "Type", "USB-C"],
      ["Compatibility", "Devices", "iPhone, iPad, Apple Watch"],
    ],
  },
  {
    slug: "ugreen-usb-c-hub-7-in-1",
    name: "Ugreen 7-in-1 USB-C Hub",
    shortDescription: "Expand laptop connectivity with HDMI, USB-A, SD/TF and PD charging.",
    category: "accessories",
    brand: "ugreen",
    mrp: 3999,
    salePrice: 2999,
    stock: 57,
    ratingAvg: 4.3,
    ratingCount: 184,
    sold: 137,
    subtype: "Hub",
    color: "Space Grey",
    warrantyMonths: 12,
    returnableDays: 7,
    hsnCode: "84733090",
    tags: ["hub", "usb-c", "laptop-accessory", "hdmi"],
    specs: [
      ["Ports", "Configuration", "HDMI, 3x USB-A, SD, TF, USB-C PD"],
      ["Video", "Output", "Up to 4K @ 30Hz"],
      ["Material", "Body", "Aluminium alloy"],
    ],
  },
];

async function seedCatalog() {
  const categoryMap = new Map<string, string>();
  const brandMap = new Map<string, string>();
  const productMap = new Map<string, string>();

  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        icon: c.icon,
        sortOrder: c.sortOrder,
        active: true,
      },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        sortOrder: c.sortOrder,
        active: true,
      },
    });
    categoryMap.set(c.slug, row.id);
  }

  for (const b of brands) {
    const row = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {
        name: b.name,
        countryCode: b.countryCode,
        logoUrl: `https://picsum.photos/seed/${b.slug}-logo/200/200`,
        active: true,
      },
      create: {
        slug: b.slug,
        name: b.name,
        countryCode: b.countryCode,
        logoUrl: `https://picsum.photos/seed/${b.slug}-logo/200/200`,
        active: true,
      },
    });
    brandMap.set(b.slug, row.id);
  }

  for (const p of products) {
    const categoryId = categoryMap.get(p.category);
    const brandId = brandMap.get(p.brand);
    if (!categoryId || !brandId) {
      throw new Error(`Missing category/brand for product ${p.slug}`);
    }

    const returnableDays = p.returnableDays ?? 7;
    const warrantyMonths = p.warrantyMonths ?? 12;
    const lowStockAt = p.lowStockAt ?? 5;
    const ratingAvg = p.ratingAvg ?? 0;
    const ratingCount = p.ratingCount ?? 0;
    const sold = p.sold ?? 0;
    const views = Math.max(25, sold * 11 + ratingCount * 3);
    const description = makeDescription(p.name, p.shortDescription, returnableDays);

    const row = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        shortDescription: p.shortDescription,
        categoryId,
        brandId,
        mrp: p.mrp,
        salePrice: p.salePrice,
        discountPercent: discount(p.mrp, p.salePrice),
        stock: p.stock,
        lowStockAt,
        ratingAvg,
        ratingCount,
        sold,
        views,
        featured: p.featured ?? false,
        active: true,
        subtype: p.subtype ?? null,
        ram: p.ram ?? null,
        storage: p.storage ?? null,
        screenSize: p.screenSize ?? null,
        processor: p.processor ?? null,
        color: p.color ?? null,
        warrantyMonths,
        returnableDays,
        codEligible: true,
        emiEligible: true,
        exchangeEligible: p.category !== "accessories",
        hsnCode: p.hsnCode ?? null,
        tags: p.tags ?? [],
      },
      create: {
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        categoryId,
        brandId,
        mrp: p.mrp,
        salePrice: p.salePrice,
        discountPercent: discount(p.mrp, p.salePrice),
        stock: p.stock,
        lowStockAt,
        ratingAvg,
        ratingCount,
        sold,
        views,
        featured: p.featured ?? false,
        active: true,
        subtype: p.subtype ?? null,
        ram: p.ram ?? null,
        storage: p.storage ?? null,
        screenSize: p.screenSize ?? null,
        processor: p.processor ?? null,
        color: p.color ?? null,
        warrantyMonths,
        returnableDays,
        codEligible: true,
        emiEligible: true,
        exchangeEligible: p.category !== "accessories",
        hsnCode: p.hsnCode ?? null,
        tags: p.tags ?? [],
      },
    });

    productMap.set(p.slug, row.id);

    await prisma.productImage.deleteMany({ where: { productId: row.id } });
    await prisma.productImage.createMany({
      data: [
        {
          productId: row.id,
          url: img(`${p.slug}-hero`),
          alt: `${p.name} primary view`,
          position: 0,
          isPrimary: true,
        },
        {
          productId: row.id,
          url: img(`${p.slug}-angle`),
          alt: `${p.name} alternate view`,
          position: 1,
          isPrimary: false,
        },
        {
          productId: row.id,
          url: img(`${p.slug}-detail`),
          alt: `${p.name} detail view`,
          position: 2,
          isPrimary: false,
        },
      ],
    });

    await prisma.productSpecification.deleteMany({ where: { productId: row.id } });
    await prisma.productSpecification.createMany({
      data: [
        {
          productId: row.id,
          group: "General",
          label: "Brand",
          value: brands.find((b) => b.slug === p.brand)?.name ?? p.brand,
        },
        {
          productId: row.id,
          group: "General",
          label: "Category",
          value: categories.find((c) => c.slug === p.category)?.name ?? p.category,
        },
        ...p.specs.map(([group, label, value]) => ({
          productId: row.id,
          group,
          label,
          value,
        })),
      ],
    });
  }

  return { categoryMap, brandMap, productMap };
}

/* ───────────────────────── marketing ───────────────────────── */

async function seedMarketing(
  categoryMap: Map<string, string>,
  brandMap: Map<string, string>,
  productMap: Map<string, string>,
) {
  const offers: Array<{
  code: string;
  type: string;
  title: string;
  description: string;
  bankName?: string;
  categorySlug?: string;
  brandSlug?: string;
  productSlug?: string;
  priority: number;
}> = [
  {
    code: "BANK_ICICI_10",
    type: "BANK",
    title: "10% instant discount with ICICI Bank credit cards",
    description: "Maximum discount ₹1,500 per transaction. Applicable on prepaid orders only.",
    bankName: "ICICI Bank",
    priority: 100,
  },
  {
    code: "BANK_HDFC_5",
    type: "BANK",
    title: "5% cashback with HDFC Bank cards",
    description: "Cashback credited within 7 working days after delivery.",
    bankName: "HDFC Bank",
    priority: 90,
  },
  {
    code: "EXCHANGE_PHONE_12000",
    type: "EXCHANGE",
    title: "Up to ₹12,000 exchange bonus on smartphones",
    description: "Old device pickup at delivery. Final value depends on model and condition.",
    categorySlug: "mobiles",
    priority: 80,
  },
  {
    code: "EMI_NO_COST_12M",
    type: "EMI",
    title: "No-cost EMI up to 12 months",
    description: "Available on select cards and products above ₹2,500.",
    priority: 70,
  },
  {
    code: "COMBO_AUDIO",
    type: "COMBO",
    title: "Bundle audio accessories and save extra",
    description: "Add eligible earbuds or speakers at checkout for combo pricing.",
    categorySlug: "accessories",
    priority: 60,
  },
  {
    code: "FESTIVAL_APPLIANCE",
    type: "FESTIVAL",
    title: "Festival savings on large appliances",
    description: "Additional discounts on ACs, refrigerators and washing machines during campaign windows.",
    categorySlug: "home-appliances",
    priority: 50,
  },
];

  for (const o of offers) {
    await prisma.offer.upsert({
      where: { code: o.code },
      update: {
        type: o.type,
        title: o.title,
        description: o.description,
        bankName: o.bankName ?? null,
        categoryId: o.categorySlug ? categoryMap.get(o.categorySlug) ?? null : null,
        brandId: o.brandSlug ? brandMap.get(o.brandSlug) ?? null : null,
        productId: o.productSlug ? productMap.get(o.productSlug) ?? null : null,
        active: true,
        priority: o.priority,
        startsAt: new Date(),
        endsAt: daysFromNow(45),
      },
      create: {
        code: o.code,
        type: o.type,
        title: o.title,
        description: o.description,
        bankName: o.bankName ?? null,
        categoryId: o.categorySlug ? categoryMap.get(o.categorySlug) ?? null : null,
        brandId: o.brandSlug ? brandMap.get(o.brandSlug) ?? null : null,
        productId: o.productSlug ? productMap.get(o.productSlug) ?? null : null,
        active: true,
        priority: o.priority,
        startsAt: new Date(),
        endsAt: daysFromNow(45),
      },
    });
  }

  const coupons = [
    {
      code: "VOLT10",
      description: "10% off on your order, up to ₹1,500",
      type: CouponType.PERCENT,
      value: 10,
      scope: CouponScope.ALL,
      minOrderValue: 999,
      maxDiscount: 1500,
      usageLimit: 1000,
      perUserLimit: 1,
    },
    {
      code: "LAPTOP5",
      description: "5% off on laptops, up to ₹10,000",
      type: CouponType.PERCENT,
      value: 5,
      scope: CouponScope.CATEGORY,
      categorySlug: "laptops",
      minOrderValue: 50000,
      maxDiscount: 10000,
      usageLimit: 300,
      perUserLimit: 1,
    },
    {
      code: "ACCESSORY200",
      description: "Flat ₹200 off on accessories above ₹1,499",
      type: CouponType.FIXED,
      value: 200,
      scope: CouponScope.CATEGORY,
      categorySlug: "accessories",
      minOrderValue: 1499,
      usageLimit: 800,
      perUserLimit: 2,
    },
    {
      code: "SAMSUNG5",
      description: "Extra 5% off on Samsung products",
      type: CouponType.PERCENT,
      value: 5,
      scope: CouponScope.BRAND,
      brandSlug: "samsung",
      minOrderValue: 10000,
      maxDiscount: 5000,
      usageLimit: 500,
      perUserLimit: 1,
    },
    {
      code: "WELCOME250",
      description: "Flat ₹250 off for first-time VoltKart buyers",
      type: CouponType.FIXED,
      value: 250,
      scope: CouponScope.ALL,
      minOrderValue: 2999,
      usageLimit: 2000,
      perUserLimit: 1,
    },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        description: c.description,
        type: c.type,
        value: c.value,
        scope: c.scope,
        categoryId: c.categorySlug ? categoryMap.get(c.categorySlug) ?? null : null,
        brandId: c.brandSlug ? brandMap.get(c.brandSlug) ?? null : null,
        minOrderValue: c.minOrderValue,
        maxDiscount: c.maxDiscount ?? null,
        usageLimit: c.usageLimit ?? null,
        perUserLimit: c.perUserLimit,
        active: true,
        startsAt: new Date(),
        endsAt: daysFromNow(60),
      },
      create: {
        code: c.code,
        description: c.description,
        type: c.type,
        value: c.value,
        scope: c.scope,
        categoryId: c.categorySlug ? categoryMap.get(c.categorySlug) ?? null : null,
        brandId: c.brandSlug ? brandMap.get(c.brandSlug) ?? null : null,
        minOrderValue: c.minOrderValue,
        maxDiscount: c.maxDiscount ?? null,
        usageLimit: c.usageLimit ?? null,
        perUserLimit: c.perUserLimit,
        active: true,
        startsAt: new Date(),
        endsAt: daysFromNow(60),
      },
    });
  }

  await prisma.banner.deleteMany({
    where: {
      slot: { in: ["PROMO_STRIP", "SALE", "CATEGORY", "FOOTER"] },
    },
  });

  await prisma.banner.createMany({
    data: [
      {
        slot: "PROMO_STRIP",
        title: "Free delivery above ₹999",
        subtitle: "Standard shipping across serviceable PIN codes",
        ctaLabel: "Shop now",
        ctaHref: "/products/all",
        active: true,
        sortOrder: 1,
      },
      {
        slot: "PROMO_STRIP",
        title: "Express delivery in metros",
        subtitle: "24–48 hour delivery on eligible PIN codes",
        ctaLabel: "Check PIN code",
        ctaHref: "/track",
        active: true,
        sortOrder: 2,
      },
      {
        slot: "SALE",
        title: "Weekend electronics sale",
        subtitle: "Top discounts on mobiles, laptops and appliances",
        ctaLabel: "View deals",
        ctaHref: "/products/all?sort=discount",
        active: true,
        sortOrder: 3,
      },
      {
        slot: "CATEGORY",
        title: "Upgrade your phone",
        subtitle: "Exchange bonus available on select models",
        ctaLabel: "Browse mobiles",
        ctaHref: "/products/mobiles",
        active: true,
        sortOrder: 4,
      },
      {
        slot: "CATEGORY",
        title: "Laptops for work and play",
        subtitle: "No-cost EMI from 3 months",
        ctaLabel: "Browse laptops",
        ctaHref: "/products/laptops",
        active: true,
        sortOrder: 5,
      },
      {
        slot: "FOOTER",
        title: "Need help choosing?",
        subtitle: "Talk to a product specialist before you buy",
        ctaLabel: "Contact support",
        ctaHref: "/contact",
        active: true,
        sortOrder: 6,
      },
    ],
  });

  async function upsertSlide(
    id: string,
    data: {
      badge: string;
      headline: string;
      highlight?: string;
      description?: string;
      ctaLabel: string;
      ctaHref?: string;
      secondaryLabel?: string;
      secondaryHref?: string;
      gradient: GradientTheme;
      sortOrder: number;
    },
    productSlugs: string[],
  ) {
    await prisma.heroSlide.upsert({
      where: { id },
      update: {
        kind: "CUSTOM",
        active: true,
        startsAt: new Date(),
        endsAt: daysFromNow(90),
        ...data,
      },
      create: {
        id,
        kind: "CUSTOM",
        active: true,
        startsAt: new Date(),
        endsAt: daysFromNow(90),
        ...data,
      },
    });

    await prisma.heroSlideProduct.deleteMany({ where: { slideId: id } });

    const rows = await prisma.product.findMany({
      where: { slug: { in: productSlugs }, active: true },
      select: { id: true, slug: true },
    });

    const order = new Map(productSlugs.map((s, i) => [s, i]));
    const sorted = rows.sort(
      (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
    );

    if (sorted.length) {
      await prisma.heroSlideProduct.createMany({
        data: sorted.map((p, position) => ({
          slideId: id,
          productId: p.id,
          position,
        })),
      });
    }
  }

  await upsertSlide(
    "seed-slide-launch",
    {
      badge: "NEW ARRIVALS",
      headline: "India's newest,",
      highlight: "tech drops",
      description:
        "iPhone 16 series, Galaxy S25 Ultra and OnePlus 13 are live with launch pricing and exchange support.",
      ctaLabel: "Shop new arrivals",
      ctaHref: "/products/all?sort=newest",
      secondaryLabel: "See offers",
      secondaryHref: "/offers",
      gradient: GradientTheme.EMERALD_TECH,
      sortOrder: 1,
    },
    [
      "apple-iphone-16-pro-256gb-desert-titanium",
      "samsung-galaxy-s25-ultra-512gb-titanium-black",
      "oneplus-13-16gb-512gb-black-obsidian",
    ],
  );

  await upsertSlide(
    "seed-slide-sale",
    {
      badge: "MEGA SALE",
      headline: "Big savings on,",
      highlight: "daily essentials",
      description:
        "ACs, refrigerators, washing machines and kitchen appliances at festival-style prices.",
      ctaLabel: "Browse appliances",
      ctaHref: "/products/home-appliances",
      secondaryLabel: "Coupons",
      secondaryHref: "/offers",
      gradient: GradientTheme.SUNSET_DEAL,
      sortOrder: 2,
    },
    [
      "samsung-1-5-ton-3-star-inverter-split-ac",
      "lg-260l-3-star-double-door-refrigerator",
      "preethi-mixer-grinder-750w-blue-leaf",
    ],
  );

  await upsertSlide(
    "seed-slide-emi",
    {
      badge: "NO-COST EMI",
      headline: "Own it today,",
      highlight: "pay in EMIs",
      description:
        "Selected laptops and flagships available on 3, 6, 9 and 12-month no-cost EMI plans.",
      ctaLabel: "Explore laptops",
      ctaHref: "/products/laptops",
      secondaryLabel: "EMI offers",
      secondaryHref: "/offers",
      gradient: GradientTheme.STEEL_GRAPHITE,
      sortOrder: 3,
    },
    [
      "apple-macbook-air-13-m3-16gb-512gb-midnight",
      "dell-xps-13-9350-core-ultra-7-16gb-512gb",
      "asus-rog-strix-g16-rtx-5070-i9-32gb-1tb",
    ],
  );

  async function setFeature(section: FeatureSection, slugs: string[]) {
    await prisma.productFeature.deleteMany({ where: { section } });

    const unique = Array.from(new Set(slugs));
    const rows = await prisma.product.findMany({
      where: { slug: { in: unique }, active: true },
      select: { id: true, slug: true },
    });

    const order = new Map(unique.map((s, i) => [s, i]));
    const sorted = rows.sort(
      (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
    );

    if (sorted.length) {
      await prisma.productFeature.createMany({
        data: sorted.map((p, position) => ({
          section,
          productId: p.id,
          position,
        })),
      });
    }
  }

  await setFeature(FeatureSection.NEW_ARRIVALS, [
    "apple-iphone-16-pro-256gb-desert-titanium",
    "samsung-galaxy-s25-ultra-512gb-titanium-black",
    "oneplus-13-16gb-512gb-black-obsidian",
    "google-pixel-9-pro-256gb-obsidian",
    "apple-ipad-air-11-m3-128gb-space-grey",
    "asus-rog-strix-g16-rtx-5070-i9-32gb-1tb",
    "sony-bravia-55-inch-4k-google-tv",
    "ugreen-usb-c-hub-7-in-1",
  ]);

  await setFeature(FeatureSection.HOT_DEALS, [
    "boat-rockerz-450-anc-tws",
    "preethi-mixer-grinder-750w-blue-leaf",
    "samsung-1-5-ton-3-star-inverter-split-ac",
    "hp-victus-15-rtx-4050-i5",
    "redmi-note-14-pro-5g-8gb-256gb",
    "anker-powercore-20000mah-22-5w",
    "whirlpool-28l-convection-microwave",
    "lg-260l-3-star-double-door-refrigerator",
  ]);

  await setFeature(FeatureSection.TRENDING, [
    "apple-iphone-16-128gb-ultramarine",
    "samsung-galaxy-a56-5g-8gb-128gb-blue",
    "apple-macbook-air-13-m3-16gb-512gb-midnight",
    "lenovo-thinkpad-e14-gen-5-ryzen-5",
    "bosch-7kg-frontend-washing-machine",
    "apple-usb-c-20w-charger",
  ]);

  await setFeature(FeatureSection.BEST_SELLERS, [
    "boat-rockerz-450-anc-tws",
    "apple-usb-c-20w-charger",
    "redmi-note-14-pro-5g-8gb-256gb",
    "samsung-galaxy-a56-5g-8gb-128gb-blue",
    "preethi-mixer-grinder-750w-blue-leaf",
    "hp-pavilion-14-core-i5-13th-16gb-512gb",
  ]);

  await prisma.frequentlyBoughtPair.deleteMany({});

  const fbpPairs = [
    [
      "apple-iphone-16-pro-256gb-desert-titanium",
      ["apple-usb-c-20w-charger", "anker-powercore-20000mah-22-5w"],
    ],
    [
      "apple-macbook-air-13-m3-16gb-512gb-midnight",
      ["ugreen-usb-c-hub-7-in-1", "apple-usb-c-20w-charger"],
    ],
    [
      "samsung-galaxy-s25-ultra-512gb-titanium-black",
      ["anker-powercore-20000mah-22-5w", "boat-rockerz-450-anc-tws"],
    ],
  ] as const;

  const fbpData: { primaryId: string; addOnId: string }[] = [];
  for (const [primarySlug, addOnSlugs] of fbpPairs) {
    const primaryId = productMap.get(primarySlug);
    if (!primaryId) continue;

    for (const addOnSlug of addOnSlugs) {
      const addOnId = productMap.get(addOnSlug);
      if (addOnId && addOnId !== primaryId) {
        fbpData.push({ primaryId, addOnId });
      }
    }
  }

  if (fbpData.length) {
    await prisma.frequentlyBoughtPair.createMany({
      data: fbpData,
      skipDuplicates: true,
    });
  }
}

/* ───────────────────────── users + orders ───────────────────────── */

async function seedUsersAndOrders(productMap: Map<string, string>) {
  const customerPassword = await bcrypt.hash("Customer@12345", 12);

  async function ensureCustomer(input: {
    email: string;
    name: string;
    phone: string;
    whatsappOptIn: boolean;
  }) {
    return prisma.user.upsert({
      where: { email: input.email },
      update: {
        name: input.name,
        phone: input.phone,
        whatsappOptIn: input.whatsappOptIn,
        role: Role.CUSTOMER,
        active: true,
      },
      create: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash: customerPassword,
        role: Role.CUSTOMER,
        whatsappOptIn: input.whatsappOptIn,
        active: true,
      },
    });
  }

  const priya = await ensureCustomer({
    email: "priya@example.com",
    name: "Priya Verma",
    phone: "9876543210",
    whatsappOptIn: true,
  });

  const rahul = await ensureCustomer({
    email: "rahul@example.com",
    name: "Rahul Nair",
    phone: "9812345678",
    whatsappOptIn: false,
  });

  await prisma.address.deleteMany({ where: { userId: { in: [priya.id, rahul.id] } } });

  const priyaAddress = await prisma.address.create({
    data: {
      userId: priya.id,
      label: "Home",
      fullName: "Priya Verma",
      phone: "9876543210",
      pincode: "560103",
      line1: "Flat 402, Prestige Meridian",
      line2: "Outer Ring Road",
      city: "Bengaluru",
      state: "Karnataka",
      isDefault: true,
    },
  });

  const rahulAddress = await prisma.address.create({
    data: {
      userId: rahul.id,
      label: "Work",
      fullName: "Rahul Nair",
      phone: "9812345678",
      pincode: "400705",
      line1: "Unit 703, Kalpataru Square",
      line2: "Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      isDefault: true,
    },
  });

  type BuildLine = { slug: string; quantity: number };

  async function buildLines(lines: BuildLine[]) {
    const out: {
      productId: string;
      name: string;
      slug: string;
      brand: string;
      image: string;
      unitMrp: number;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
      warrantyMonths: number;
    }[] = [];

    for (const line of lines) {
      const p = await prisma.product.findUniqueOrThrow({
        where: { slug: line.slug },
        include: {
          brand: { select: { name: true } },
          images: {
            select: { url: true, isPrimary: true, position: true },
            orderBy: { position: "asc" },
          },
        },
      });

      const image =
        p.images.find((i) => i.isPrimary)?.url ??
        p.images[0]?.url ??
        img(p.slug);

      out.push({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand.name,
        image,
        unitMrp: p.mrp,
        unitPrice: p.salePrice,
        quantity: line.quantity,
        lineTotal: p.salePrice * line.quantity,
        warrantyMonths: p.warrantyMonths,
      });
    }

    return out;
  }

  function totalsFromLines(
    lines: Awaited<ReturnType<typeof buildLines>>,
    opts: { deliveryFee: number; codFee: number; couponDiscount?: number },
  ) {
    const subtotalMrp = lines.reduce((s, l) => s + l.unitMrp * l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const itemDiscount = subtotalMrp - subtotal;
    const payable = Math.max(0, subtotal - (opts.couponDiscount ?? 0));
    const total = payable + opts.deliveryFee + opts.codFee;
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

    return {
      subtotalMrp,
      subtotal,
      itemDiscount,
      total,
      itemCount,
      gstComponent: gstComponent(total),
    };
  }

  const deliveredLines = await buildLines([
    { slug: "boat-rockerz-450-anc-tws", quantity: 1 },
    { slug: "apple-usb-c-20w-charger", quantity: 1 },
  ]);

  const deliveredTotals = totalsFromLines(deliveredLines, {
    deliveryFee: 0,
    codFee: 0,
  });

  const deliveredOrder = await getOrCreateOrder("VKSEEDDELIVERED", () =>
    prisma.order.create({
      data: {
        orderNumber: "VKSEEDDELIVERED",
        userId: priya.id,
        status: OrderStatus.DELIVERED,
        paymentMethod: PaymentMethod.UPI,
        paymentStatus: PaymentStatus.PAID,
        subtotalMrp: deliveredTotals.subtotalMrp,
        subtotal: deliveredTotals.subtotal,
        itemDiscount: deliveredTotals.itemDiscount,
        couponDiscount: 0,
        deliveryFee: 0,
        codFee: 0,
        total: deliveredTotals.total,
        gstRate: 18,
        gstComponent: deliveredTotals.gstComponent,
        deliveryMode: "STANDARD",
        etaFrom: daysFromNow(-7),
        etaTo: daysFromNow(-5),
        deliveredAt: daysFromNow(-4),
        carrier: "Delhivery Partner Network",
        trackingNumber: "VKTRKSEED000001",
        addressSnapshot: {
          label: priyaAddress.label,
          fullName: priyaAddress.fullName,
          phone: priyaAddress.phone,
          pincode: priyaAddress.pincode,
          line1: priyaAddress.line1,
          line2: priyaAddress.line2,
          city: priyaAddress.city,
          state: priyaAddress.state,
        },
        items: {
          create: deliveredLines.map((l) => ({
            productId: l.productId,
            name: l.name,
            slug: l.slug,
            brand: l.brand,
            image: l.image,
            unitMrp: l.unitMrp,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
            warrantyMonths: l.warrantyMonths,
          })),
        },
        payments: {
          create: {
            method: PaymentMethod.UPI,
            status: PaymentStatus.PAID,
            amountPaise: deliveredTotals.total * 100,
            razorpayOrderId: "order_seed_delivered",
            razorpayPaymentId: "pay_seed_delivered",
            razorpaySignature: "seed_signature",
            capturedAt: daysFromNow(-8),
          },
        },
        trackingEvents: {
          create: [
            {
              status: OrderStatus.PENDING,
              title: "Order placed",
              description: "Payment received. Your order is confirmed.",
              location: "VoltKart Digital",
              createdAt: daysFromNow(-8),
            },
            {
              status: OrderStatus.CONFIRMED,
              title: "Order confirmed",
              description: "Moved to packing queue.",
              location: "Bengaluru HDC",
              createdAt: daysFromNow(-7),
            },
            {
              status: OrderStatus.PROCESSING,
              title: "Processing at fulfilment centre",
              description: "Unit serial verified and packed.",
              location: "Bengaluru HDC",
              createdAt: daysFromNow(-6),
            },
            {
              status: OrderStatus.SHIPPED,
              title: "Shipped",
              description: "Handed over to carrier.",
              location: "Bengaluru",
              createdAt: daysFromNow(-5),
            },
            {
              status: OrderStatus.OUT_FOR_DELIVERY,
              title: "Out for delivery",
              description: "Expected today.",
              location: "Bengaluru",
              createdAt: daysFromNow(-4),
            },
            {
              status: OrderStatus.DELIVERED,
              title: "Delivered",
              description: "Delivered to customer.",
              location: "Bengaluru",
              createdAt: daysFromNow(-4),
            },
          ],
        },
      },
    }),
  );

  const shippedLines = await buildLines([
    { slug: "apple-macbook-air-13-m3-16gb-512gb-midnight", quantity: 1 },
  ]);

  const shippedTotals = totalsFromLines(shippedLines, {
    deliveryFee: 0,
    codFee: 0,
  });

  await getOrCreateOrder("VKSEEDSHIPPED", () =>
    prisma.order.create({
      data: {
        orderNumber: "VKSEEDSHIPPED",
        userId: rahul.id,
        status: OrderStatus.SHIPPED,
        paymentMethod: PaymentMethod.CARD,
        paymentStatus: PaymentStatus.PAID,
        subtotalMrp: shippedTotals.subtotalMrp,
        subtotal: shippedTotals.subtotal,
        itemDiscount: shippedTotals.itemDiscount,
        couponDiscount: 0,
        deliveryFee: 0,
        codFee: 0,
        total: shippedTotals.total,
        gstRate: 18,
        gstComponent: shippedTotals.gstComponent,
        deliveryMode: "EXPRESS",
        etaFrom: daysFromNow(1),
        etaTo: daysFromNow(2),
        carrier: "Blue Dart Express",
        trackingNumber: "VKTRKSEED000002",
        addressSnapshot: {
          label: rahulAddress.label,
          fullName: rahulAddress.fullName,
          phone: rahulAddress.phone,
          pincode: rahulAddress.pincode,
          line1: rahulAddress.line1,
          line2: rahulAddress.line2,
          city: rahulAddress.city,
          state: rahulAddress.state,
        },
        items: {
          create: shippedLines.map((l) => ({
            productId: l.productId,
            name: l.name,
            slug: l.slug,
            brand: l.brand,
            image: l.image,
            unitMrp: l.unitMrp,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
            warrantyMonths: l.warrantyMonths,
          })),
        },
        payments: {
          create: {
            method: PaymentMethod.CARD,
            status: PaymentStatus.PAID,
            amountPaise: shippedTotals.total * 100,
            razorpayOrderId: "order_seed_shipped",
            razorpayPaymentId: "pay_seed_shipped",
            razorpaySignature: "seed_signature",
            capturedAt: daysFromNow(-2),
          },
        },
        trackingEvents: {
          create: [
            {
              status: OrderStatus.PENDING,
              title: "Order placed",
              description: "Payment received.",
              location: "VoltKart Digital",
              createdAt: daysFromNow(-2),
            },
            {
              status: OrderStatus.CONFIRMED,
              title: "Order confirmed",
              description: "Ready for dispatch.",
              location: "Mumbai HDC",
              createdAt: daysFromNow(-1),
            },
            {
              status: OrderStatus.SHIPPED,
              title: "Shipped",
              description: "In transit to Mumbai.",
              location: "Mumbai",
              createdAt: daysFromNow(0),
            },
          ],
        },
      },
    }),
  );

  const pendingLines = await buildLines([
    { slug: "samsung-1-5-ton-3-star-inverter-split-ac", quantity: 1 },
  ]);

  const pendingTotals = totalsFromLines(pendingLines, {
    deliveryFee: 0,
    codFee: 49,
  });

  await getOrCreateOrder("VKSEEDPENDING", () =>
    prisma.order.create({
      data: {
        orderNumber: "VKSEEDPENDING",
        userId: null,
        guestEmail: "guest@example.com",
        guestPhone: "9898989898",
        status: OrderStatus.PENDING,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PENDING,
        subtotalMrp: pendingTotals.subtotalMrp,
        subtotal: pendingTotals.subtotal,
        itemDiscount: pendingTotals.itemDiscount,
        couponDiscount: 0,
        deliveryFee: 0,
        codFee: 49,
        total: pendingTotals.total,
        gstRate: 18,
        gstComponent: pendingTotals.gstComponent,
        deliveryMode: "STANDARD",
        etaFrom: daysFromNow(3),
        etaTo: daysFromNow(6),
        addressSnapshot: {
          label: "Home",
          fullName: "Guest Customer",
          phone: "9898989898",
          pincode: "110016",
          line1: "B-12, Second Floor",
          line2: "Greater Kailash I",
          city: "New Delhi",
          state: "Delhi",
        },
        items: {
          create: pendingLines.map((l) => ({
            productId: l.productId,
            name: l.name,
            slug: l.slug,
            brand: l.brand,
            image: l.image,
            unitMrp: l.unitMrp,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
            warrantyMonths: l.warrantyMonths,
          })),
        },
        trackingEvents: {
          create: [
            {
              status: OrderStatus.PENDING,
              title: "Order placed",
              description: "Cash on delivery order awaiting confirmation call.",
              location: "VoltKart Digital",
              createdAt: daysFromNow(0),
            },
          ],
        },
      },
    }),
  );

  const firstDeliveredItem = await prisma.orderItem.findFirst({
    where: { orderId: deliveredOrder.id },
    orderBy: { id: "asc" },
  });

   if (firstDeliveredItem) {
    await prisma.returnRequest.upsert({
      where: { orderItemId: firstDeliveredItem.id },
      update: {},
      create: {
        orderItemId: firstDeliveredItem.id,
        orderId: deliveredOrder.id,
        userId: priya.id,
        reason: ReturnReason.DAMAGED,
        details:
          "Outer carton was crushed and one earbud case had a visible scratch.",
        status: ReturnStatus.REQUESTED,
        resolution: "REFUND",
      },
    });
  }

  const demoSubscriberEmail = "demo-subscriber@example.com";

  await prisma.subscriber.upsert({
    where: { email: demoSubscriberEmail },
    update: {
      active: true,
      whatsappOptIn: true,
    },
    create: {
      email: demoSubscriberEmail,
      phone: "9876543210",
      whatsappOptIn: true,
      source: "SEED",
      active: true,
    },
  });

  const demoContactEmail = "demo-contact@example.com";

  const existingContact = await prisma.contactMessage.findFirst({
    where: {
      email: demoContactEmail,
      topic: "SALES",
    },
  });

  if (!existingContact) {
    await prisma.contactMessage.create({
      data: {
        name: "Demo Customer",
        email: demoContactEmail,
        phone: "9812345678",
        topic: "SALES",
        message:
          "Do you support exchange for iPhone 13 to iPhone 16 Pro? What is the expected uplift?",
      },
    });
  }

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: priya.id,
      title: "Return requested",
    },
  });

  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: priya.id,
        audience: "USER",
        title: "Return requested",
        body:
          "Your return request for boAt Rockerz 450 is under review. We will update you shortly.",
        href: "/account/orders",
        channel: "IN_APP",
      },
    });
  }
}

async function seedCommunity(productMap: Map<string, string>) {
  const priya = await prisma.user.findUnique({
    where: { email: "priya@example.com" },
  });

  const rahul = await prisma.user.findUnique({
    where: { email: "rahul@example.com" },
  });

  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  const boatId = productMap.get("boat-rockerz-450-anc-tws");
  const macId = productMap.get(
    "apple-macbook-air-13-m3-16gb-512gb-midnight",
  );

  if (priya && boatId) {
    await prisma.review.upsert({
      where: {
        productId_userId: {
          productId: boatId,
          userId: priya.id,
        },
      },
      update: {},
      create: {
        productId: boatId,
        userId: priya.id,
        rating: 5,
        title: "Solid ANC for the price",
        body:
          "Pairing is quick, battery lasts through my commute, and the case feels sturdy. Delivery was fast and packaging was intact.",
        verified: true,
        helpfulCount: 4,
        published: true,
      },
    });

    const reviewAggregate = await prisma.review.aggregate({
      where: {
        productId: boatId,
        published: true,
      },
      _avg: {
        rating: true,
      },
      _count: true,
    });

    await prisma.product.update({
      where: { id: boatId },
      data: {
        ratingAvg: reviewAggregate._avg.rating ?? 0,
        ratingCount: reviewAggregate._count,
      },
    });
  }

  if (rahul && macId) {
    const existingQuestion = await prisma.question.findFirst({
      where: {
        productId: macId,
        userId: rahul.id,
      },
    });

    if (!existingQuestion) {
      const question = await prisma.question.create({
        data: {
          productId: macId,
          userId: rahul.id,
          body:
            "Does the 13-inch M3 MacBook Air support two external monitors?",
        },
      });

      if (admin) {
        await prisma.answer.create({
          data: {
            questionId: question.id,
            userId: admin.id,
            body:
              "Yes. It supports up to two external displays at their native resolution when connected via Thunderbolt / USB-C adapters.",
            isOfficial: true,
          },
        });

        await prisma.question.update({
          where: { id: question.id },
          data: { answered: true },
        });
      }
    }

    const existingTicket = await prisma.supportTicket.findFirst({
      where: {
        userId: rahul.id,
        subject: "MacBook external display question",
      },
    });

    if (!existingTicket) {
      await prisma.supportTicket.create({
        data: {
          reference: "VKSUP-SEED001",
          userId: rahul.id,
          email: rahul.email,
          subject: "MacBook external display question",
          category: "PRODUCT",
          status: TicketStatus.OPEN,
          messages: {
            create: {
              userId: rahul.id,
              body:
                "I want to confirm dual monitor support before placing the order.",
            },
          },
        },
      });
    }
  }

  if (priya) {
    const existingFeedback = await prisma.feedback.findFirst({
      where: {
        userId: priya.id,
      },
    });

    if (!existingFeedback) {
      await prisma.feedback.create({
        data: {
          userId: priya.id,
          name: priya.name,
          email: priya.email,
          productQuality: 5,
          delivery: 4,
          customerService: 5,
          packaging: 4,
          website: 5,
          overall: 5,
          comment:
            "Smooth checkout and clear order tracking. Wish there were more installation support videos for appliances.",
        },
      });
    }
  }
}

async function main() {
  console.log("Seeding VoltKart database...");

  const { categoryMap, brandMap, productMap } = await seedCatalog();

  await seedMarketing(categoryMap, brandMap, productMap);
  await seedUsersAndOrders(productMap);
  await seedCommunity(productMap);

  console.log("Seed complete.");
  console.log("Demo customer password: Customer@12345");
  console.log("Run: npm run seed:admin");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });