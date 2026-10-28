// prisma/seed-pincode.ts
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CSV = path.join(process.cwd(), "pincodes.csv");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((v) => v !== "")) rows.push(row); }
  return rows;
}

const colIdx = (headers: string[], ...needles: string[]) =>
  headers.findIndex((h) => needles.some((n) => h.toLowerCase().includes(n)));

async function main() {
  if (!fs.existsSync(CSV)) {
    console.error(`Missing ${CSV}. Run Step 1 first.`);
    process.exit(1);
  }
  
    console.log("Reading CSV...");
  const rows = parseCsv(fs.readFileSync(CSV, "utf8"));

  // Guard the first index (noUncheckedIndexedAccess makes rows[0] possibly-undefined).
  const headerRow = rows[0];
  if (!headerRow || headerRow.length === 0) {
    console.error("❌ CSV is empty or has no header row.");
    process.exit(1);
  }
  const head = headerRow.map((h) => h.trim());
  
  console.log("Detected columns:", head.join(", "));
  
  const iPin = colIdx(head, "pin");
  const iTaluk = colIdx(head, "taluk", "sub-district", "subdistrict", "division");
  const iDist = colIdx(head, "district");
  const iOffice = colIdx(head, "office name", "post office", "name");
  
  if (iPin < 0) { 
    console.error("❌ Could not find PIN column. Headers were:", head); 
    process.exit(1); 
  }
  
  console.log(`Using columns: pin[${iPin}], taluk/division[${iTaluk}], district[${iDist}], office[${iOffice}]`);
  
  const stripOffice = (s: string) => s.replace(/\s+(H\.?O\.?|SO|BO|Branch Post Office|Sub Post Office)$/i, "").trim();
  const seen = new Set<string>();
  const data: { pin: string; city: string }[] = [];
  
  for (const r of rows.slice(1)) {
    const pin = (r[iPin] ?? "").trim();
    if (!/^[1-9]\d{5}$/.test(pin) || seen.has(pin)) continue;
    
    const city =
      (iTaluk >= 0 ? (r[iTaluk] ?? "").trim() : "") ||
      (iDist >= 0 ? (r[iDist] ?? "").trim() : "") ||
      (iOffice >= 0 ? stripOffice((r[iOffice] ?? "").trim()) : "");
    
    if (!city) continue;
    seen.add(pin);
    data.push({ pin, city });
  }
  
  console.log(`Found ${data.length} unique PINs to insert.\nUpserting…`);
  
  const CHUNK = 500;
  for (let i = 0; i < data.length; i += CHUNK) {
    const slice = data.slice(i, i + CHUNK);
    await prisma.$transaction(
      slice.map((d) =>
        prisma.pincode.upsert({
          where: { pin: d.pin },
          update: { city: d.city },
          create: { pin: d.pin, city: d.city },
        }),
      ),
    );
    process.stdout.write(`  ${Math.min(i + CHUNK, data.length)}/${data.length}\r`);
  }
  
  console.log(`\n✅ Done. Pincode table has ${await prisma.pincode.count()} rows.`);
}

main()
  .catch((e) => { console.error("\n❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());