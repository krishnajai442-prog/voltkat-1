import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MOBILES = [
  "Apple", "Google", "MOTOROLA", "vivo", "OPPO", "Infinix", "Nothing",
  "POCO", "realme", "Samsung", "REDMI", "LAVA", "itel", "OnePlus", "MTR",
  "Kechaoda", "IQOO", "Tecno", "ringme", "KARBONN", "Mi", "Nokia", "Peace",
  "Ai+", "oneme", "Jmax", "I Kall", "Micromax", "SIAVANTAGE", "Snexan",
  "HMD", "GFive", "HOTLINE", "SONY", "FONEME", "Jio", "Panasonic", "Gamma",
  "HTC", "Fuziqra", "leysky", "Sia", "Pious",
];
const APPLIANCES = [
  "USHA", "Whirlpool", "Voltas", "Haier", "Orient Electric", "Godrej",
  "IFB", "V-Guard", "Blue Star", "Kenstar", "BOSCH", "PHILIPS", "LUMINOUS",
  "AGARO", "AO Smith", "Symphony", "Voltas Beko", "Atomberg",
  "1250 WATT ONE BUERRNE", "1Goal", "1stopbharat", "22 TECH", "24×7eMall",
  "2forthoroad", "2Seven",
];
const APPLIANCES_KITCHEN = [
  "2stone", "3d Creations", "3PSTORE", "4ME By Sankalpa", "4MYL", "4square",
  "4tens", "4uonly", "5starStore01", "7Eleven Enterprise", "8Star", "90 Degree",
  "9rings", "A G Enterprises", "A K BRASS EXPORT", "A&T", "A-ONE", "A1 Gadgets",
  "AABROSS", "AADCART", "AADGEX", "Aadya Shoppings", "AAENT", "Aahiv enterprise",
  "AAI ENTERPRISE", "AAIK", "Aalok", "AANANDX", "Aanaya Traders", "Aannie",
  "AANVI TRENDZ", "AARAS ENTERPRISE", "Aarav Boss", "AARCHITA", "AARKRI SALES",
  "AaruBhakti", "AARVI", "Aarvi Enterprise", "AARVI ENTERPRISES", "Aarvient",
  "AarvikVentures", "Aarvixa", "AASHI GIFTS STORE", "AashiNova", "AASHU",
  "AashviEnterprise", "Aastha Electronic", "AASTHA TRADERS", "AASTIK SALES",
  "Aatrangi", "AAWADKRUPA ENTERPRISES", "Aaynzexx", "ABADAF", "ABC", "ABCD",
  "ABE", "ABEEBHA", "Abdulkhondkar", "ABHAY", "Abhinest", "ABHISTORE", "ABIBA",
  "Abirami", "ABlue Clipper", "ABN", "ABZA", "Ace Blend",
];
const LAPTOPS = [
  "HP", "Lenovo", "ASUS", "DELL", "Acer", "MSI", "MICROSOFT", "Primebook",
  "GIGABYTE", "Prittec", "WarnerCann", "Neopticon", "Ultimus",
];
const ACCESSORIES = [
  // mobile accessories batch
  "3D U PRINT", "3REE", "3sSeller", "4 ur Fone", "4 YARDS", "4BT", "4uonly",
  "56 CASE AND COVER", "5starStore01", "7CR", "7Orbit", "7printzone", "7Rocks",
  "7STYLES", "8 elements", "90stethix", "99Drops", "99Gems", "9H", "9Ways",
  "A & J", "A CONNECT Z", "A D SOLANKI", "A KOVERKART", "A One", "A R Enterprise",
  "A R ETERPRISE", "A S Group", "A To Z Enterprises", "A-Allin1", "A-ONE RETAIL",
  "A-star", "A.K.S.G.", "A2 Gold", "A2S", "A3sprime", "AAA Spares", "AAACreation",
  "AABAZR", "AABBZRVC", "AABLUE ENTERPRISES", "AABRA KA DAABRA", "AACL", "AADGEX",
  "Aadhvi", "aadhvik", "Aadil", "AADVI", "AADYA CREATION", "AAF", "Aaghosh",
  "Ajmya", "Aakansha Creation", "Aakashkumar", "Aakhira", "AAKRITI", "Aakrutii",
  "Akshara", "AAMS", "Aapcase", "AARABEAUTY", "Aaralhub", "Aarav Enterprises",
  "AARAWA", "AARERED", "AARMEET", "AARNIK", "Aarnov", "Aarnu", "Aarohi", "Aarov",
  "AARU ENTERPRISES", "Spigen", "Portronics", "ZEBRONICS", "Ambrane", "Noise",
  "URBN", "Flipkart SmartBuy", "Ringke", "wrap craft", "DailyObjects", "MINIKIDZ",
  "11D", "120 wt fast charger", "16SM", "1stopsolutions", "20SKY", "24 ENERGY",
  "3D GOLDTM", "CMF by Nothing",
  // laptop accessories batch
  "Ant Esports", "Intex", "Logitech", "LAPCARE", "EVOFOX", "WACOM", "SpinBot",
  "AAL", "AARTI ENTERPRISES", "ADJ", "ADP TRADERS", "AISP", "ALSAAS", "100yellow",
  "4MADSFASHION", "A Plus Products", "A1 SQUARE", "A1GRAPHIX", "AadamsAnime",
  "alakhh", "AlexVyan", "Aliens", "All Star", "Allit", "ALLWIPES", "Alzarsi",
  "AMANVANI", "AMB", "AMF STORE", "AMKETTE", "AMobility", "Ampeva", "AMRITAAKSH",
  "Amulakh", "AMYCAUR", "Anant", "ANANYA", "ANBBZRPLAS", "Ancestors", "Ang",
  "Anilshrivas", "Anita", "ANJO", "Ankirun", "Annhad retailer", "ANSHAURA",
  "Ant", "Ant Value", "Antiscartch", "AOOMI", "APAS", "APB", "APBZR", "APBZRPLAS",
  "Apen Kasana", "Aadhya Bloom", "AakashTomer", "AartiEnterprise", "Aarvik",
  "Aavjo", "aazmi", "ABD", "abhigya mart", "ABPM", "Absolute Wellings", "AD NET",
  "Adaptro", "ADCOM", "Adhunik", "Adhvik", "Admiz", "ADNet", "Adrenex", "ADTOO",
  "ADVANCE GADGETS", "Advik Arts", "AEBZRPLAS", "AERALUX", "Aerixor", "Aerobee",
  "AES", "Afpin", "Agyvvt", "AINOO", "AirCase", "AirSoft", "APENTERPRISES",
  "APEXPOSURATBN",
];
// Existing brands these facets also list → Accessories appended to their tags.
const ALSO_ACCESSORIES = [
  "Samsung", "Apple", "vivo", "MOTOROLA", "OPPO", "realme", "Google",
  "OnePlus", "Mi", "boAt", "Infinix", "Nothing", "Tecno", "Xiaomi",
  "HP", "DELL", "Acer", "ASUS", "Lenovo",
];
const EXTRA: Record<string, string[]> = {
  Samsung: ["Mobiles", "Laptops", "Home Appliances"],
  Apple: ["Mobiles", "Laptops"],
  Sony: ["Mobiles", "Home Appliances"],
  LG: ["Home Appliances", "Mobiles"],
  Anker: ["Accessories"], boAt: ["Accessories"], Ugreen: ["Accessories"],
  Bosch: ["Home Appliances"], Preethi: ["Home Appliances"], Whirlpool: ["Home Appliances"],
  Google: ["Mobiles"], OnePlus: ["Mobiles"], Realme: ["Mobiles"], Xiaomi: ["Mobiles"],
  ASUS: ["Laptops"], Dell: ["Laptops"], HP: ["Laptops"], Lenovo: ["Laptops"],
};

function slugify(name: string): string {
  return (
    name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim()
      .replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  ) || "brand";
}

async function main() {
  const cats = new Map<string, Set<string>>();
  const add = (n: string, c: string) => {
    if (!cats.has(n)) cats.set(n, new Set());
    cats.get(n)!.add(c);
  };
  MOBILES.forEach((n) => add(n, "Mobiles"));
  APPLIANCES.forEach((n) => add(n, "Home Appliances"));
  APPLIANCES_KITCHEN.forEach((n) => add(n, "Home Appliances"));
  LAPTOPS.forEach((n) => add(n, "Laptops"));
  ACCESSORIES.forEach((n) => add(n, "Accessories"));
  ALSO_ACCESSORIES.forEach((n) => add(n, "Accessories"));
  for (const [n, cs] of Object.entries(EXTRA)) cs.forEach((c) => add(n, c));

  let added = 0, tagged = 0, skipped = 0;

  for (const [name, set] of cats) {
    const existing = await prisma.brand.findFirst({ where: { name } });
    if (existing) {
      const before = existing.categories ?? [];
      const merged = [...new Set([...before, ...set])];
      if (merged.length !== before.length) {
        await prisma.brand.update({ where: { id: existing.id }, data: { categories: merged } });
        tagged++;
      } else skipped++;
      continue;
    }
    const base = slugify(name);
    let slug = base, n = 2;
    while (await prisma.brand.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${n++}`;
    await prisma.brand.create({ data: { name, slug, categories: [...set] } });
    added++;
  }

  console.log(`Brands: ${added} added, ${tagged} re-tagged, ${skipped} unchanged.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());