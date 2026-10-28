/**
 * VoltKart delivery serviceability — LIVE town-level data via API Ninjas,
 * with the static district maps retained as an offline/quota fallback.
 *
 * Resolution order for a serviceable PIN:
 *   1. deny rules (format / obvious-fake / block-lists)  -> no network spent
 *   2. PIN_OVERRIDE (hand-verified patches)              -> instant, no network
 *   3. in-memory cache of prior API results              -> instant, no network
 *   4. API Ninjas /v1/pincode                            -> town city + state
 *   5. district maps PIN3/PIN2/FIRST                     -> fallback (never denies)
 *
 * The API supplies `cityHint` + `region` (state). ETA days still come from the
 * district maps (the API has no ETA). A missing/blank API city falls through to
 * the district map, so a valid-but-unindexed PIN still shows a sensible city.
 */

export type PincodeInspection = {
  serviceable: boolean;
  cityHint: string | null;
  region: string | null;
  etaFrom: string | null; // ISO
  etaTo: string | null;   // ISO
  message: string;
};

import prisma from "@/lib/prisma"; // server-only; delivery.ts is imported solely by /api/delivery

// Local, unlimited, instant town lookup. Returns null on miss so the caller
// falls through to the API key, then the district map.
async function lookupLocal(pin: string): Promise<{ city: string; state: string | null } | null> {
  try {
    const row = await prisma.pincode.findUnique({ where: { pin }, select: { city: true, state: true } });
    if (!row || !row.city) return null;
    return { city: row.city, state: row.state ?? null };
  } catch {
    return null; // DB hiccup must never deny a real customer
  }
}

// Fire-and-forget self-heal: a successful API town result is written back so the
// next identical query is local (table converges toward full coverage without re-running the seed).
function backfillLocal(pin: string, city: string, state: string | null) {
  void prisma.pincode
    .upsert({ where: { pin }, update: { city, state: state ?? undefined }, create: { pin, city, state } })
    .catch(() => {});
}

/* ----------------------------- config ----------------------------- */

// Move this to .env (PINCODE_API_KEY=...) and rotate the value you pasted in
// chat — a secret that has appeared in a transcript should be considered leaked.
// The literal here is only a working fallback so the app runs out-of-the-box.
const PINCODE_API_KEY =
  process.env.PINCODE_API_KEY ??
  "579b464db66ec23bdd0000016c806e67a8a94fe56e6f389d57051f7f";
const PINCODE_API_URL = "https://api.apininjas.com/v1/pincode";
const API_TIMEOUT_MS = 4000;

/* --------------------- editable block-lists ----------------------- */

const INVALID_PINS = new Set<string>([
  "000000",
  "111111","222222","333333","444444","555555","666666","777777","888888","999999",
  "123456","654321","987654","456123",
  "121212","212121","131313","313131","101010",
  "123123","321321","112233","332211","123321",
  "234567","345678","456789","567890","678901","789012","890123","901234",
]);

// 2-digit sub-region prefixes you genuinely do NOT ship to. Empty by default so
// we never deny a real area by accident. Add e.g. "35","90" after verifying.
const RESTRICTED_PREFIXES = new Set<string>([
  // "35", "90",
]);

// Path-A hand patches: PINs whose API/district city you want to force.
// Fill from indiapost.gov.in (Taluk/town, NOT district). Empty by default is safe.
const PIN_OVERRIDE: Record<string, { city: string; state: string }> = {
  // "852131": { city: "<taluk>", state: "Bihar" },
};

/* ------------------- display-only district maps ------------------- */
/* Misses here NEVER deny; they only supply a fallback city/region/days. */

type Meta = { city: string; region: string; days: number };

const PIN3: Record<string, Meta> = {
  "110": { city: "New Delhi",      region: "Delhi",                 days: 1 },
  "121": { city: "Faridabad",      region: "Haryana",               days: 2 },
  "122": { city: "Gurugram",       region: "Haryana",               days: 2 },
  "125": { city: "Hisar",          region: "Haryana",               days: 3 },
  "141": { city: "Ludhiana",       region: "Punjab",                days: 2 },
  "143": { city: "Amritsar",       region: "Punjab",                days: 3 },
  "147": { city: "Patiala",        region: "Punjab",                days: 3 },
  "160": { city: "Chandigarh",     region: "Chandigarh / Punjab",   days: 2 },
  "171": { city: "Shimla",         region: "Himachal Pradesh",      days: 4 },
  "201": { city: "Noida",          region: "Uttar Pradesh",         days: 2 },
  "208": { city: "Kanpur",         region: "Uttar Pradesh",         days: 3 },
  "221": { city: "Varanasi",       region: "Uttar Pradesh",         days: 4 },
  "226": { city: "Lucknow",        region: "Uttar Pradesh",         days: 3 },
  "248": { city: "Dehradun",       region: "Uttarakhand",           days: 4 },
  "249": { city: "Haridwar",       region: "Uttarakhand",           days: 4 },
  "282": { city: "Agra",           region: "Uttar Pradesh",         days: 3 },
  "302": { city: "Jaipur",         region: "Rajasthan",             days: 3 },
  "380": { city: "Ahmedabad",      region: "Gujarat",               days: 3 },
  "390": { city: "Vadodara",       region: "Gujarat",               days: 3 },
  "395": { city: "Surat",          region: "Gujarat",               days: 3 },
  "400": { city: "Mumbai",         region: "Maharashtra",           days: 2 },
  "411": { city: "Pune",           region: "Maharashtra",           days: 2 },
  "422": { city: "Nashik",         region: "Maharashtra",           days: 3 },
  "431": { city: "Chhatrapati Sambhajinagar", region: "Maharashtra", days: 4 },
  "440": { city: "Nagpur",         region: "Maharashtra",           days: 3 },
  "452": { city: "Indore",         region: "Madhya Pradesh",        days: 3 },
  "462": { city: "Bhopal",         region: "Madhya Pradesh",        days: 3 },
  "474": { city: "Gwalior",        region: "Madhya Pradesh",        days: 4 },
  "482": { city: "Jabalpur",       region: "Madhya Pradesh",        days: 4 },
  "492": { city: "Raipur",         region: "Chhattisgarh",          days: 4 },
  "500": { city: "Hyderabad",      region: "Telangana",             days: 2 },
  "506": { city: "Warangal",       region: "Telangana",             days: 4 },
  "520": { city: "Vijayawada",     region: "Andhra Pradesh",        days: 4 },
  "530": { city: "Visakhapatnam",  region: "Andhra Pradesh",        days: 4 },
  "560": { city: "Bengaluru",      region: "Karnataka",             days: 2 },
  "600": { city: "Chennai",        region: "Tamil Nadu",            days: 2 },
  "620": { city: "Tiruchirappalli",region: "Tamil Nadu",            days: 4 },
  "625": { city: "Madurai",        region: "Tamil Nadu",            days: 4 },
  "641": { city: "Coimbatore",     region: "Tamil Nadu",            days: 3 },
  "682": { city: "Kochi",          region: "Kerala",                days: 3 },
  "695": { city: "Thiruvananthapuram", region: "Kerala",            days: 4 },
  "700": { city: "Kolkata",        region: "West Bengal",           days: 2 },
  "751": { city: "Bhubaneswar",    region: "Odisha",                days: 4 },
  "781": { city: "Guwahati",       region: "Assam",                 days: 5 },
  "800": { city: "Patna",          region: "Bihar",                 days: 4 },
  "823": { city: "Gaya",           region: "Bihar",                 days: 5 },
  "831": { city: "Jamshedpur",     region: "Jharkhand",             days: 4 },
  "834": { city: "Ranchi",         region: "Jharkhand",             days: 4 },
  "842": { city: "Muzaffarpur",    region: "Bihar",                 days: 5 },
  "852": { city: "Bhagalpur",      region: "Bihar",                 days: 5 },
};

const PIN2: Record<string, { region: string; days: number }> = {
  "11": { region: "Delhi",                days: 1 },
  "12": { region: "Haryana",              days: 2 },
  "14": { region: "Punjab",               days: 3 },
  "16": { region: "Chandigarh / Punjab",  days: 2 },
  "17": { region: "Himachal Pradesh",     days: 4 },
  "18": { region: "Jammu & Kashmir",      days: 6 },
  "20": { region: "Uttar Pradesh",        days: 3 },
  "22": { region: "Uttar Pradesh",        days: 3 },
  "24": { region: "Uttarakhand",          days: 4 },
  "28": { region: "Uttar Pradesh",        days: 3 },
  "30": { region: "Rajasthan",            days: 3 },
  "38": { region: "Gujarat",              days: 3 },
  "39": { region: "Gujarat",              days: 3 },
  "40": { region: "Maharashtra",          days: 2 },
  "41": { region: "Maharashtra",          days: 2 },
  "42": { region: "Maharashtra",          days: 3 },
  "43": { region: "Maharashtra",          days: 4 },
  "44": { region: "Maharashtra",          days: 3 },
  "45": { region: "Madhya Pradesh",       days: 3 },
  "46": { region: "Madhya Pradesh",       days: 3 },
  "47": { region: "Madhya Pradesh",       days: 4 },
  "48": { region: "Madhya Pradesh",       days: 4 },
  "49": { region: "Chhattisgarh",         days: 4 },
  "50": { region: "Telangana",            days: 2 },
  "52": { region: "Andhra Pradesh",       days: 4 },
  "53": { region: "Andhra Pradesh",       days: 4 },
  "56": { region: "Karnataka",            days: 2 },
  "60": { region: "Tamil Nadu",           days: 2 },
  "62": { region: "Tamil Nadu",           days: 4 },
  "64": { region: "Tamil Nadu",           days: 3 },
  "68": { region: "Kerala",               days: 3 },
  "69": { region: "Kerala",               days: 4 },
  "70": { region: "West Bengal",          days: 2 },
  "75": { region: "Odisha",               days: 4 },
  "78": { region: "Assam / North-East",   days: 5 },
  "79": { region: "North-East India",     days: 6 },
  "80": { region: "Bihar",                days: 4 },
  "82": { region: "Bihar",                days: 5 },
  "83": { region: "Jharkhand",            days: 4 },
  "84": { region: "Bihar",                days: 5 },
  "85": { region: "Bihar",                days: 5 },
};

const FIRST: Record<string, { region: string; days: number }> = {
  "1": { region: "North India",                           days: 3 },
  "2": { region: "Uttar Pradesh & Uttarakhand",           days: 3 },
  "3": { region: "Rajasthan & Gujarat",                   days: 3 },
  "4": { region: "Maharashtra, MP & Chhattisgarh",        days: 3 },
  "5": { region: "Karnataka, Telangana & Andhra Pradesh", days: 3 },
  "6": { region: "Tamil Nadu, Kerala & Puducherry",       days: 3 },
  "7": { region: "East & North-East India",               days: 5 },
  "8": { region: "Bihar & Jharkhand",                     days: 5 },
  "9": { region: "APO / Armed Forces",                    days: 7 },
};

/* ----------------------------- helpers ---------------------------- */

const PIN_FORMAT = /^[1-9]\d{5}$/;

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function isObviouslyFake(pin: string): boolean {
  const n = [...pin].map((c) => Number(c));
  const first = n[0] ?? 0;
  if (n.every((v) => v === first)) return true;
  const tail = n.slice(1);
  const asc  = tail.every((v, i) => (v - (n[i] ?? 0) + 10) % 10 === 1);
  const desc = tail.every((v, i) => (v - (n[i] ?? 0) + 10) % 10 === 9);
  return asc || desc;
}

function deny(message: string): PincodeInspection {
  return { serviceable: false, cityHint: null, region: null, etaFrom: null, etaTo: null, message };
}

// District-level inspection (the old behaviour). Always serviceable:true.
// Used as the offline/quota/miss fallback so a network problem never denies.
function districtInspection(pin: string): PincodeInspection {
  const p2 = pin.slice(0, 2);
  const p3 = pin.slice(0, 3);
  const d1 = pin.charAt(0);
  const m3 = PIN3[p3];
  const m2 = PIN2[p2];
  const m1 = FIRST[d1];
  const region = m3?.region ?? m2?.region ?? m1?.region ?? "India";
  const city = m3?.city ?? null;
  const days = m3?.days ?? m2?.days ?? m1?.days ?? 4;
  const now = new Date().toISOString();
  return {
    serviceable: true,
    cityHint: city,
    region,
    etaFrom: addDays(now, Math.max(1, days - 1)),
    etaTo: addDays(now, days),
    message: `Deliverable to ${city ?? region}.`,
  };
}

// ETA days for a PIN, from the district maps (API has no ETA field).
function daysFor(pin: string): number {
  return (
    PIN3[pin.slice(0, 3)]?.days ??
    PIN2[pin.slice(0, 2)]?.days ??
    FIRST[pin.charAt(0)]?.days ??
    4
  );
}

/* ------------------------- live-API plumbing ---------------------- */

// Per-process cache: each unique PIN costs <=1 network call. Warm serverless
// instances reuse it; cold starts re-fetch (and re-cache) — acceptable for a
// store whose traffic concentrates on metros.
const cache = new Map<string, PincodeInspection>();
let quotaExhausted = false; // latch: stop spending calls once the key is dry

type ApiNinjasRes = {
  pincode?: string | number;
  city?: string;
  state?: string;
  country?: string;
  message?: string;
};

async function fetchFromApi(pin: string): Promise<PincodeInspection | null> {
  // null = "no usable town data" (caller falls back to district map).
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  try {
    const url = `${PINCODE_API_URL}?pincode=${encodeURIComponent(pin)}&apikey=${encodeURIComponent(PINCODE_API_KEY)}`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });

    if (res.status === 429 || /quota|limit|exceed/i.test(res.headers.get("www-authenticate") ?? "")) {
      quotaExhausted = true;
      return null;
    }
    if (!res.ok) return null;

    const json = (await res.json()) as ApiNinjasRes;
    const city = typeof json.city === "string" ? json.city.trim() : "";
    const state = typeof json.state === "string" ? json.state.trim() : "";

    // Treat a quota-style body message as exhaustion too (some tiers 200 + text).
    if (!city && /quota|limit|exceed|invalid api/i.test(json.message ?? "")) {
      quotaExhausted = true;
      return null;
    }
    if (!city) return null; // valid PIN but no town record -> district fallback

    const now = new Date().toISOString();
    const days = daysFor(pin);
    return {
      serviceable: true,
      cityHint: city,
      region: state || PIN2[pin.slice(0, 2)]?.region || FIRST[pin.charAt(0)]?.region || "India",
      etaFrom: addDays(now, Math.max(1, days - 1)),
      etaTo: addDays(now, days),
      message: `Deliverable to ${city}.`,
    };
  } catch {
    // timeout / abort / network / parse -> fall back, do NOT cache (allow retry
    // next time) unless we already latched quota above.
    return null;
  } finally {
    clearTimeout(t);
  }
}

/* --------------------------- public API --------------------------- */

export async function inspectPincode(raw: string): Promise<PincodeInspection> {
  const pin = (raw ?? "").trim();

  // 1) deny rules FIRST -> no DB, no network, instant red + toast on garbage.
  if (!PIN_FORMAT.test(pin)) return deny("Enter a valid 6-digit Indian PIN code.");
  if (isObviouslyFake(pin)) return deny("That doesn't look like a real PIN code. Please check and re-enter.");
  if (INVALID_PINS.has(pin)) return deny("We currently don't deliver to this PIN code.");
  if (RESTRICTED_PREFIXES.has(pin.slice(0, 2))) return deny("Sorry, this area is outside our delivery network right now.");

  const now = new Date().toISOString();
  const mk = (city: string, state: string | null, days: number): PincodeInspection => ({
    serviceable: true,
    cityHint: city,
    region: state || PIN2[pin.slice(0, 2)]?.region || FIRST[pin.charAt(0)]?.region || "India",
    etaFrom: addDays(now, Math.max(1, days - 1)),
    etaTo: addDays(now, days),
    message: `Deliverable to ${city}.`,
  });

  // 2) hand patches (authoritative, instant).
  const ov = PIN_OVERRIDE[pin];
  if (ov && ov.city) return mk(ov.city, ov.state || null, daysFor(pin));

  // 3) LOCAL DB first -> unlimited + instant for every seeded PIN (all regions).
  const local = await lookupLocal(pin);
  if (local) return mk(local.city, local.state, daysFor(pin));

  // 4) in-memory cache of prior API results.
  const cached = cache.get(pin);
  if (cached) return cached;

  // 5) live API key (skipped once quota latches); self-heal the DB on success.
  if (!quotaExhausted && PINCODE_API_KEY) {
    const api = await fetchFromApi(pin);
    if (api && api.cityHint) {
      cache.set(pin, api);
      backfillLocal(pin, api.cityHint, api.region); // next time it's local
      return api;
    }
    if (quotaExhausted) {
      const fb = districtInspection(pin);
      cache.set(pin, fb);
      return fb;
    }
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[delivery] no town data for ${pin}; using district fallback`);
    }
    return districtInspection(pin);
  }

  // 6) no key / quota latched -> district fallback (never denies a real PIN).
  return districtInspection(pin);
}