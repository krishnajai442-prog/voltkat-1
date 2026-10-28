import prisma from "./prisma";
import { siteUrl, toE164 } from "./utils";

type Ctx = Record<string, unknown>;

type NotifyInput = {
  template: string;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappOptIn?: boolean | null;
  ctx?: Ctx;
  href?: string | null;
};

type StaffInput = {
  template: string;
  ctx?: Ctx;
  href?: string | null;
};

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function render(template: string, ctx: Ctx = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => str(ctx[key]));
}

type TemplateDef = {
  title: string;
  body: string;
  href?: string;
  whatsappTemplate?: string;
};

const TEMPLATES: Record<string, TemplateDef> = {
  WELCOME: {
    title: "Welcome to VoltKart",
    body: "Hi {{name}}, your VoltKart account is ready. Track orders, save wishlist and checkout faster.",
    href: "/account",
  },
  ORDER_PLACED: {
    title: "Order placed {{orderNumber}}",
    body: "Thanks {{name}}. Your VoltKart order {{orderNumber}} for {{total}} has been received.",
    href: "/account/orders",
  },
  PAYMENT_SUCCESS: {
    title: "Payment successful",
    body: "Payment for order {{orderNumber}} of {{total}} was successful. Reference {{paymentId}}.",
    href: "/account/orders",
  },
  ORDER_CONFIRMED: {
    title: "Order confirmed {{orderNumber}}",
    body: "Your order {{orderNumber}} is confirmed and moving to fulfillment.",
    href: "/account/orders",
  },
  PROCESSING: {
    title: "Order processing",
    body: "Order {{orderNumber}} is being packed at our fulfillment center.",
    href: "/account/orders",
  },
  SHIPPED: {
    title: "Order shipped",
    body: "Order {{orderNumber}} shipped via {{carrier}}. Tracking ID {{trackingNumber}}.",
    href: "/account/orders",
  },
  OUT_FOR_DELIVERY: {
    title: "Out for delivery",
    body: "Order {{orderNumber}} is out for delivery and expected soon.",
    href: "/account/orders",
  },
  DELIVERED: {
    title: "Order delivered",
    body: "Order {{orderNumber}} was delivered. We hope you love it!",
    href: "/account/orders",
  },
  CANCELLED: {
    title: "Order cancelled",
    body: "Order {{orderNumber}} was cancelled. Reason: {{reason}}.",
    href: "/account/orders",
  },
  RETURN_STATUS: {
    title: "Return update {{orderNumber}}",
    body: "Return request for {{orderNumber}} is now {{status}}. {{note}}",
    href: "/account/orders",
  },
  RETURN_APPROVED: {
    title: "Return approved",
    body: "Your return for {{orderNumber}} is approved. Pickup expected {{date}}.",
    href: "/account/orders",
  },
  RETURN_REJECTED: {
    title: "Return rejected",
    body: "Your return for {{orderNumber}} could not be approved. {{note}}",
    href: "/contact",
  },
  REFUND_PROCESSED: {
    title: "Refund processed",
    body: "Refund of {{amount}} for order {{orderNumber}} has been initiated.",
    href: "/account/orders",
  },
  PASSWORD_RESET: {
    title: "Reset your VoltKart password",
    body: "Hi {{name}}, use this link to reset your password: {{site}}/auth/reset-password?token={{token}}",
  },
  TICKET_CREATED: {
    title: "Support ticket created",
    body: "Your ticket {{reference}} has been created. Our team will reply soon.",
    href: "/account/support",
  },
  SUPPORT_REPLY: {
    title: "Support reply on {{reference}}",
    body: "{{staff}} replied: {{message}}",
    href: "/account/support",
  },
  COUPON_BROADCAST: {
    title: "New coupon: {{code}}",
    body: "{{description}}. Use code {{code}} at checkout. Valid till {{date}}.",
    href: "/offers",
  },
  ADMIN_NEW_ORDER: {
    title: "New order {{orderNumber}}",
    body: "Order {{orderNumber}} for {{total}} from {{customer}} via {{method}} with {{items}} item(s).",
    href: "/admin/orders",
  },
  ADMIN_PAYMENT: {
    title: "Payment event {{orderNumber}}",
    body: "Order {{orderNumber}} amount {{total}} method {{method}} payment {{paymentId}}.",
    href: "/admin/orders",
  },
  ADMIN_RETURN: {
    title: "Return request {{orderNumber}}",
    body: "Return requested for {{product}} in order {{orderNumber}}. Reason: {{reason}}.",
    href: "/admin/returns",
  },
  ADMIN_TICKET: {
    title: "Support ticket {{reference}}",
    body: "{{customer}} opened ticket {{reference}}: {{subject}}.",
    href: "/admin/support",
  },
  ADMIN_MESSAGE: {
    title: "New message from {{name}}",
    body: "Topic {{topic}}: {{preview}}",
    href: "/admin/support",
  },
  ADMIN_REVIEW: {
    title: "New review {{rating}}★",
    body: "{{customer}} reviewed {{product}} with {{rating}} stars.",
    href: "/admin/products",
  },
  ADMIN_LOW_STOCK: {
    title: "Low stock: {{product}}",
    body: "{{product}} has {{stock}} left. Alert threshold is {{threshold}}.",
    href: "/admin/products?stock=low",
  },
  ADMIN_OUT_OF_STOCK: {
    title: "Out of stock: {{product}}",
    body: "{{product}} is now out of stock.",
    href: "/admin/products?stock=out",
  },
  ADMIN_CANCELLATION: {
    title: "Order cancelled {{orderNumber}}",
    body: "{{customer}} cancelled order {{orderNumber}}. Reason: {{reason}}.",
    href: "/admin/orders",
  },
};

function getTemplate(template: string, ctx: Ctx) {
  const def = TEMPLATES[template] ?? {
    title: "VoltKart update",
    body: render("{{message}}", ctx),
  };

  return {
    title: render(def.title, ctx),
    body: render(def.body, ctx),
    href: def.href ?? null,
    whatsappTemplate: def.whatsappTemplate ?? null,
  };
}

async function sendEmail(input: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "VoltKart <no-reply@voltkart.in>";

  if (!key) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
  } catch (e) {
    console.error("[notify:email]", e);
  }
}

async function sendSms(input: { phone: string; message: string }) {
  const key = process.env.MSG91_AUTH_KEY;
  if (!key) return;

  try {
    await fetch("https://api.msg91.com/api/v5/sendsms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_key: key,
        sender: process.env.MSG91_SENDER_ID ?? "VKTART",
        country: "91",
        route: "4",
        message: input.message.slice(0, 320),
        mobiles: input.phone,
      }),
    });
  } catch (e) {
    console.error("[notify:sms]", e);
  }
}

async function sendWhatsApp(input: {
  phone: string;
  template: string;
  variables: string[];
}) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  const to = toE164(input.phone);
  if (!to) return;

  try {
    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: input.template,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: input.variables.map((v) => ({
                type: "text",
                text: v.slice(0, 200),
              })),
            },
          ],
        },
      }),
    });
  } catch (e) {
    console.error("[notify:whatsapp]", e);
  }
}

export async function notify(input: NotifyInput) {
  const t = getTemplate(input.template, input.ctx ?? {});
  const href = input.href ?? t.href ?? null;

  if (input.userId) {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        audience: "USER",
        title: t.title,
        body: t.body,
        href,
        channel: "IN_APP",
        template: input.template,
      },
    });
  }

  if (input.email) {
    await sendEmail({
      to: input.email,
      subject: t.title,
      text: `${t.body}\n\n${siteUrl(href ?? "/")}`,
    });
  }

  if (input.phone) {
    await sendSms({
      phone: input.phone,
      message: `${t.title}: ${t.body}`,
    });

    if (input.whatsappOptIn) {
      const template =
        process.env.WHATSAPP_TEMPLATE_ORDER_UPDATE ??
        t.whatsappTemplate ??
        "order_status_update";

      await sendWhatsApp({
        phone: input.phone,
        template,
        variables: [t.title, t.body],
      });
    }
  }
}

export async function notifyStaff(input: StaffInput) {
  const t = getTemplate(input.template, input.ctx ?? {});
  const href = input.href ?? t.href ?? "/admin/dashboard";

  await prisma.notification.create({
    data: {
      audience: "STAFF",
      title: t.title,
      body: t.body,
      href,
      channel: "SYSTEM",
      template: input.template,
    },
  });

  const supportEmail = process.env.SUPPORT_EMAIL;
  if (supportEmail) {
    await sendEmail({
      to: supportEmail,
      subject: `[VoltKart Admin] ${t.title}`,
      text: `${t.body}\n\n${siteUrl(href)}`,
    });
  }
}

export async function broadcast(input: {
  template: string;
  ctx?: Ctx;
}) {
  const t = getTemplate(input.template, input.ctx ?? {});

  const subscribers = await prisma.subscriber.findMany({
    where: { active: true },
    take: 1000,
    select: {
      email: true,
      phone: true,
      whatsappOptIn: true,
    },
  });

  await Promise.all(
    subscribers.map(async (s) => {
      await sendEmail({
        to: s.email,
        subject: t.title,
        text: `${t.body}\n\n${siteUrl(t.href ?? "/offers")}`,
      });

      if (s.whatsappOptIn && s.phone) {
        const template =
          process.env.WHATSAPP_TEMPLATE_NEW_ARRIVAL ??
          t.whatsappTemplate ??
          "new_arrival_alert";

        await sendWhatsApp({
          phone: s.phone,
          template,
          variables: [t.title, t.body],
        });
      }
    }),
  );
}