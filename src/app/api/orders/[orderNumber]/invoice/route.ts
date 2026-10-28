import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Seller identity. LEFT BLANK ON PURPOSE except the name: we never print a fabricated
// GSTIN / registered address on a financial document. Drop your real details here once
// and every invoice picks them up.
const SELLER = {
  name: "VoltKart",
  tagline: "India's premier destination for electronics",
  gstin: "",            // e.g. "27ABCDE1234F1Z5"
  addressLines: [] as string[], // e.g. ["42, MG Road", "Pune, MH 411001"],
  phone: "",            // support number printed in the footer
  email: "",            // billing/support email printed in the footer
};

// Escape every interpolated value: product names and the checkout address are
// arbitrary user/merchant text, and this document is hand-built HTML.
const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (n: unknown): string => `₹${Math.round(Number(n ?? 0)).toLocaleString("en-IN")}`;

const fmtDate = (d: Date | string | null | undefined): string =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (d: Date | string | null | undefined): string =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const methodLabel = (m: string | null): string =>
  m === "COD" ? "Cash On Delivery"
  : m === "CARD" ? "Card"
  : m === "UPI" ? "UPI"
  : m === "NETBANKING" ? "Net Banking"
  : m === "WALLET" ? "Wallet"
  : (m ?? "—");

type AddressSnap = {
  name?: string; line1?: string; line2?: string;
  city?: string; state?: string; pincode?: string; phone?: string;
};

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>
  :root { --ink:#111827; --mut:#6b7280; --line:#e5e7eb; --brand:#2874f0; --bg:#f1f3f6; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .bar { position:sticky; top:0; z-index:5; display:flex; gap:8px; justify-content:center;
    padding:10px; background:#0f172a; }
  .bar a, .bar button { cursor:pointer; border:0; border-radius:8px; padding:9px 16px;
    font:600 13px/1 inherit; color:#fff; background:var(--brand); text-decoration:none; }
  .bar button.ghost { background:rgba(255,255,255,.12); }
  .sheet { max-width:820px; margin:18px auto; background:#fff; border:1px solid var(--line);
    border-radius:12px; padding:28px 30px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
  .head { display:flex; justify-content:space-between; gap:16px; align-items:flex-start;
    border-bottom:2px solid var(--ink); padding-bottom:14px; }
  .logo { font:800 22px/1 inherit; letter-spacing:-.5px; }
  .logo span { color:var(--brand); }
  .tag { color:var(--mut); font-size:11.5px; margin-top:3px; }
  .inv { text-align:right; }
  .inv h1 { margin:0; font-size:16px; letter-spacing:.12em; text-transform:uppercase; }
  .inv .no { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-weight:700; margin-top:4px; }
  .inv .dt { color:var(--mut); font-size:12px; margin-top:2px; }
  .parties { display:flex; gap:24px; margin:18px 0; }
  .parties > div { flex:1; }
  .lbl { font-size:10.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--mut); }
  .who { margin-top:5px; font-weight:700; }
  .addr { margin-top:2px; color:#374151; font-size:13px; white-space:pre-line; }
  table { width:100%; border-collapse:collapse; margin-top:6px; }
  th, td { padding:9px 8px; text-align:left; border-bottom:1px solid var(--line); vertical-align:top; }
  thead th { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--mut);
    background:#f9fafb; border-bottom:1px solid var(--line); }
  td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .strike { color:var(--mut); text-decoration:line-through; font-size:12px; }
  .desc b { display:block; }
  .desc small { color:var(--mut); }
  .totals { margin-top:14px; display:flex; justify-content:flex-end; }
  .totals table { width:320px; }
  .totals td { border:0; padding:5px 4px; }
  .totals tr.grand td { border-top:2px solid var(--ink); padding-top:9px; font-weight:800; font-size:15px; }
  .note { margin-top:16px; color:var(--mut); font-size:11px; }
  .foot { margin-top:22px; border-top:1px solid var(--line); padding-top:12px;
    display:flex; justify-content:space-between; gap:12px; color:var(--mut); font-size:11.5px; }
  .err { max-width:520px; margin:60px auto; text-align:center; }
  .err a { color:var(--brand); font-weight:700; }
  @media print {
    body { background:#fff; }
    .bar { display:none; }
    .sheet { margin:0; border:0; border-radius:0; box-shadow:none; max-width:none; padding:0; }
    tr, .parties, .totals { break-inside:avoid; }
    @page { margin:14mm; }
  }
</style></head>
<body>${body}</body></html>`;
}

export async function GET(req: Request, ctx: { params: Promise<{ orderNumber: string }> }) {
  const { searchParams } = new URL(req.url);
  const asDownload = searchParams.get("download") === "1";

  const me = await getActor();
  if (!me?.email) {
    return new Response(
      shell("Invoice unavailable", `<div class="err"><p>This invoice requires sign‑in.</p>
        <p><a href="/auth/login?next=/account/orders">Sign in</a> or <a href="/account/orders">back to orders</a>.</p></div>`),
      { status: 401, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  const { orderNumber } = await ctx.params;
  const num = decodeURIComponent(orderNumber);

  const order = await prisma.order.findFirst({
    where: { orderNumber: num, OR: [{ userId: me.id }, { guestEmail: me.email }] },
    include: {
      items: {
        select: {
          name: true, brand: true, image: true, unitMrp: true, unitPrice: true,
          quantity: true, lineTotal: true, warrantyMonths: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!order) {
    return new Response(
      shell("Invoice not found", `<div class="err"><p>We couldn't find order <b>${esc(num)}</b> on this account.</p>
        <p><a href="/account/orders">Back to your orders</a></p></div>`),
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  // addressSnapshot is read defensively (not in the confirmed scalar set), exactly like
  // the order-details page; the money/payment fields below ARE typed Order columns.
  const addr = (order as unknown as { addressSnapshot?: AddressSnap | null }).addressSnapshot ?? null;
  const buyerLines = [
    addr?.line1, addr?.line2,
    [addr?.city, addr?.state].filter(Boolean).join(", "),
    addr?.pincode,
  ].filter(Boolean).join("\n");
  const buyerPhone = addr?.phone ?? order.guestPhone ?? "";
  const buyerEmail = order.guestEmail ?? me.email ?? "";

  const rows = order.items.map((it, i) => {
    const mrp = Number(it.unitMrp);
    const price = Number(it.unitPrice);
    const discounted = mrp > price;
    return `<tr>
      <td class="num">${i + 1}</td>
      <td class="desc"><b>${esc(it.brand ? `${it.brand} ${it.name}` : it.name)}</b>
        <small>Warranty: ${esc(it.warrantyMonths)} months</small></td>
      <td class="num">${discounted ? `<span class="strike">${money(mrp)}</span>` : "—"}</td>
      <td class="num">${money(price)}</td>
      <td class="num">${esc(it.quantity)}</td>
      <td class="num">${money(it.lineTotal)}</td>
    </tr>`;
  }).join("");

  // Totals list each STORED component with its own sign and end on the stored `total`
  // (the amount actually charged). We do not assert that the rows sum to the total —
  // the reconciliation isn't documented, and inventing a formula on an invoice is worse
  // than presenting the recorded figures.
  const totalRows: string[] = [
    `<tr><td>Listing price (MRP)</td><td class="num">${money(order.subtotalMrp)}</td></tr>`,
  ];
  if (order.itemDiscount > 0)
    totalRows.push(`<tr><td>Discount on items</td><td class="num">-${money(order.itemDiscount)}</td></tr>`);
  if (order.couponDiscount > 0)
    totalRows.push(`<tr><td>Coupon${order.couponCode ? ` (${esc(order.couponCode)})` : ""}</td><td class="num">-${money(order.couponDiscount)}</td></tr>`);
  totalRows.push(`<tr><td>Net taxable value</td><td class="num">${money(order.subtotal)}</td></tr>`);
  totalRows.push(`<tr><td>Delivery fee</td><td class="num">${money(order.deliveryFee)}</td></tr>`);
  if (order.codFee > 0)
    totalRows.push(`<tr><td>COD handling fee</td><td class="num">${money(order.codFee)}</td></tr>`);
  totalRows.push(`<tr><td>GST (incl., ${esc(order.gstRate)}%)</td><td class="num">${money(order.gstComponent)}</td></tr>`);
  totalRows.push(`<tr class="grand"><td>Total amount payable</td><td class="num">${money(order.total)}</td></tr>`);

  const sellerAddr = SELLER.addressLines.filter(Boolean).join("\n");
  const body = `
  <div class="bar">
    <button type="button" onclick="window.print()">🖨 Print / Save as PDF</button>
    <a class="ghost" href="?download=1">⬇ Download file</a>
    <a class="ghost" href="/account/orders/${encodeURIComponent(num)}">← Order details</a>
  </div>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="logo">Volt<span>Kart</span></div>
        <div class="tag">${esc(SELLER.tagline)}</div>
      </div>
      <div class="inv">
        <h1>Tax Invoice</h1>
        <div class="no">#${esc(order.orderNumber)}</div>
        <div class="dt">Placed on ${esc(fmtDateTime(order.createdAt))}</div>
        <div class="dt">Status: ${esc(order.status.replace(/_/g, " "))}</div>
      </div>
    </div>

    <div class="parties">
      <div>
        <div class="lbl">Billed &amp; shipped to</div>
        <div class="who">${esc(addr?.name ?? buyerEmail)}</div>
        <div class="addr">${esc(buyerLines || "Address on file")}</div>
        ${buyerPhone ? `<div class="addr">${esc(buyerPhone)}</div>` : ""}
        ${buyerEmail ? `<div class="addr">${esc(buyerEmail)}</div>` : ""}
      </div>
      <div>
        <div class="lbl">Seller</div>
        <div class="who">${esc(SELLER.name)}</div>
        ${sellerAddr ? `<div class="addr">${esc(sellerAddr)}</div>` : ""}
        ${SELLER.gstin ? `<div class="addr">GSTIN: ${esc(SELLER.gstin)}</div>` : ""}
        <div class="addr">Payment: ${esc(methodLabel(order.paymentMethod))} · ${esc(order.paymentStatus)}</div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th class="num">#</th><th>Description</th><th class="num">MRP</th>
        <th class="num">Unit price</th><th class="num">Qty</th><th class="num">Line total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals"><table><tbody>${totalRows.join("")}</tbody></table></div>

    <p class="note">Amounts and tax/fee components as recorded at checkout. The total reflects the
      amount charged to the customer. This is a computer‑generated invoice and does not require a signature.</p>

    <div class="foot">
      <span>${SELLER.phone ? `Support: ${esc(SELLER.phone)} · ` : ""}${SELLER.email ? esc(SELLER.email) : esc(SELLER.name)}</span>
      <span>Thank you for shopping with ${esc(SELLER.name)}.</span>
    </div>
  </div>`;

  const headers: Record<string, string> = { "content-type": "text/html; charset=utf-8" };
  if (asDownload) {
    const safe = order.orderNumber.replace(/[^A-Za-z0-9_-]/g, "");
    headers["content-disposition"] = `attachment; filename="invoice-${safe || "order"}.html"`;
  }
  return new Response(shell(`Invoice ${order.orderNumber}`, body), { status: 200, headers });
}