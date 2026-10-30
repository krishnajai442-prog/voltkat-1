/**
 * Order-status notifications (WhatsApp + email), with optional delivery OTP.
 *
 * Rules:
 *  - Never throws to the caller (fire-and-forget + try/catch): a provider
 *    outage or missing key must NOT fail an admin's status click.
 *  - No per-user opt-in gate: phone present -> WhatsApp, email present -> email.
 *  - Without provider keys it LOGS the exact message (DRY-RUN) so you can see
 *    the real payload in the terminal. Add keys in .env -> it actually sends.
 *  - The OTP (when passed) appears ONLY in the customer message, never in logs.
 */
import prisma from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function trackingLink(orderNumber: string) {
  return `${APP_URL}/account/orders/${encodeURIComponent(orderNumber)}`;
}

function humanStatus(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function buildMessage(orderNumber: string, status: string, name: string | null, otp?: string) {
  const hi = name ? `Hi ${name.split(" ")[0]}, ` : "";
  const link = trackingLink(orderNumber);
  let text = `${hi}your VoltKart order #${orderNumber} is now ${humanStatus(status)}.\nTrack it here: ${link}`;
  if (otp) {
    text += `\n\nYour delivery OTP is ${otp}. Share it ONLY with the delivery agent to confirm handover.`;
  }
  return { text, link };
}

/** Normalize an Indian mobile to E.164 (+91…) for WhatsApp providers. */
function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `+91${d.slice(1)}`; // legacy leading-zero rows
  if (d.length === 12 && d.startsWith("91")) return `+${d}`;
  if (raw.trim().startsWith("+")) return raw.trim();
  return null;
}

/* ----------------------------- channels ----------------------------- */

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+15005550006 (sandbox)
  if (!sid || !token || !from) {
    console.log(`[notify:whatsapp:DRY-RUN] to=${to}\n  ${body}`);
    return false;
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: body }).toString(),
    });
    if (!res.ok) console.error("[notify:whatsapp] HTTP", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[notify:whatsapp] failed", e);
    return false;
  }
}

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? process.env.EMAIL_FROM ?? "VoltKart <onboarding@resend.dev>";
  if (!key) {
    console.log(`[notify:email:DRY-RUN] to=${to} subject="${subject}"\n  ${body}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });
    if (!res.ok) console.error("[notify:email] HTTP", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[notify:email] failed", e);
    return false;
  }
}

/* ----------------------------- SMS (MSG91) ----------------------------- */

/**
 * Transactional/OTP SMS via MSG91, mirroring sendEmail's never-throws contract.
 * Dry-run (logs a MASKED body, never the raw code) when MSG91 keys are absent, so
 * an unprovisioned env degrades to local logging instead of throwing into a route.
 *
 * VERIFY BEFORE RELYING ON LIVE SENDS: MSG91 exposes several send endpoints
 * (v5/flow template send, v2/sendsms plain, OTP short-link). The env names
 * (TEMPLATE_ID + SENDER_ID + AUTH_KEY) point at the template/flow send encoded
 * below. Confirm in your MSG91 dashboard that this template is an OTP or
 * Transactional type and that the variable key matches (commonly {{OTP}} or
 * ##OTP##); if your template differs, swap endpoint/body to match. A wrong shape
 * 400s but fails safe here (returns false, never throws), so signup degrades to
 * the route's dev-code path rather than breaking. India transactional SMS also
 * requires a DLT/TFP-registered header + approved template - that is provisioning,
 * not code, and no body shape fixes an unapproved template at the carrier.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID;
  if (!authKey || !templateId || !senderId) {
    // Mask any 6-digit run so an unconfigured env never prints a live OTP to console.
    const masked = body.replace(/\b\d{6}\b/g, "______");
    console.log(`[notify:sms:DRY-RUN] to=${to}\n  ${masked}`);
    return false;
  }
  // MSG91 India typically expects 91XXXXXXXXXX; normalize defensively.
  const d = to.replace(/\D/g, "");
  const mobile = d.length === 10 ? `91${d}` : d.length === 12 && d.startsWith("91") ? d : d;
  try {
    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { authorization: authKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: senderId,
        template_id: templateId,
        template_type: "otp",
        auth_key: authKey,
        flows: [{ mobile, message: body }],
      }),
    });
    if (!res.ok) console.error("[notify:sms] HTTP", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[notify:sms] failed", e);
    return false;
  }
}

/* --------------------------- public entry --------------------------- */

/**
 * Call after an order's status changes. Fire-and-forget: returns immediately.
 * Pass `otp` only when a delivery code was just minted (SHIPPED /
 * OUT_FOR_DELIVERY); it is appended to the customer message and nowhere else.
 */
export function notifyStatusChange(orderId: string, otp?: string): void {
  void (async () => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          orderNumber: true,
          status: true,
          user: { select: { name: true, email: true, phone: true } },
        },
      });
      if (!order?.user) return; // guest order / no account -> nothing to notify

      const { text } = buildMessage(order.orderNumber, order.status, order.user.name, otp);
      const subject = `Order #${order.orderNumber} — ${humanStatus(order.status)}`;

      const phone = toE164(order.user.phone);
      const email = order.user.email?.trim();

      await Promise.allSettled([
        phone ? sendWhatsApp(phone, text) : Promise.resolve(false),
        email ? sendEmail(email, subject, text) : Promise.resolve(false),
      ]);
    } catch (e) {
      console.error("[notify] unexpected failure (swallowed)", e);
    }
  })();
}
