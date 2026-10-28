const GENERIC = {
  plural: "devices and appliances",
  meta: "Genuine products, assured warranty, no-cost EMI and fast delivery across India.",
  intro:
    "Every unit is sourced through authorised distribution, serial-verified at intake and covered by brand warranty. Filter by spec, compare side by side, and check live stock before you commit.",
};

const LIBRARY: Record<string, { plural: string; meta: string; intro: string }> = {
  Apple: {
    plural: "iPhones, MacBooks and iPads",
    meta: "Buy Apple India — iPhone, MacBook Air/Pro and iPad with no-cost EMI, exchange bonus and 1-year brand warranty.",
    intro:
      "Apple devices at VoltKart carry India warranty, GST invoice and activation support. Trade in your old phone at delivery for instant exchange credit, and split the cost across 3–12 month no-cost EMI plans.",
  },
  Samsung: {
    plural: "Galaxy phones, TVs and appliances",
    meta: "Samsung India store — Galaxy S/Z series, Neo QLED TVs, washing machines and refrigerators with best prices and EMI.",
    intro:
      "From Galaxy flagships to Neo QLED televisions and SmartThings appliances, our Samsung shelf is stocked with current-generation stock only, verified serial numbers and manufacturer warranty registration help at delivery.",
  },
  OnePlus: {
    plural: "OnePlus phones and audio",
    meta: "OnePlus India — Nord and numbered series phones, Buds and wearables with launch pricing and exchange bonus.",
    intro:
      "We list OnePlus launch variants the day they go on sale in India, with OxygenOS-ready units, 12-month warranty and exchange uplift on eligible devices.",
  },
  Dell: {
    plural: "Latitude, Inspiron and Alienware laptops",
    meta: "Dell laptops India — XPS, Latitude business ultrabooks and Alienware gaming rigs with onsite warranty support.",
    intro:
      "Dell business lines ship with ProSupport eligibility, and Alienware units are bench-tested before dispatch. Configure by processor, RAM and storage using the filters on this page.",
  },
  HP: {
    plural: "HP laptops and printers",
    meta: "HP India — Pavilion, Envy, Spectre and Victus laptops with genuine Windows, best price and no-cost EMI.",
    intro:
      "All HP stock is India-retail (not imported grey units), meaning full manufacturer warranty and onsite serviceability. Filter by Intel Core generation, RTX GPU or display size.",
  },
  Lenovo: {
    plural: "ThinkPad and Legion laptops",
    meta: "Lenovo India — ThinkPad business notebooks, IdeaPad and Legion gaming laptops at corporate-friendly pricing.",
    intro:
      "ThinkPads come with keyboard warranty guidance and BIOS provisioning notes for enterprise buyers. Legion rigs are stress-tested for thermals before dispatch.",
  },
  Asus: {
    plural: "ROG, Vivobook and Zenbook",
    meta: "ASUS India — ROG gaming laptops, Zenbook ultrabooks and Vivobook series with authentic warranty.",
    intro:
      "ASUS ROG hardware is validated with a 20-minute load test at our fulfilment centre, so you receive a machine that holds its boost clocks.",
  },
};

export function brandPageCopy(brand: string) {
  return LIBRARY[brand] ?? GENERIC;
}