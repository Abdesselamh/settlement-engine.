import crypto from "crypto";
import { storage } from "./storage";

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

function signPayload(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export async function deliverWebhooks(event: string, data: Record<string, any>): Promise<void> {
  try {
    const allWebhooks = await storage.getWebhooks();
    const eligible = allWebhooks.filter(wh => {
      if (!wh.active) return false;
      const events = wh.events.split(",").map(e => e.trim());
      return events.includes(event) || events.includes("*");
    });

    if (eligible.length === 0) return;

    const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data };
    const payloadStr = JSON.stringify(payload, null, 2);

    await Promise.allSettled(eligible.map(async (wh) => {
      try {
        const signature = signPayload(payloadStr, wh.secret);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-InstantSettlement-Signature": signature,
            "X-InstantSettlement-Event": event,
            "User-Agent": "InstantSettlement.ai/3.0",
          },
          body: payloadStr,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const responseBody = await response.text().catch(() => "");
        await storage.recordWebhookDelivery({
          webhookId: wh.id,
          event,
          payload: payloadStr,
          statusCode: response.status,
          success: response.ok,
          responseBody: responseBody.slice(0, 500),
        });
      } catch (err: any) {
        await storage.recordWebhookDelivery({
          webhookId: wh.id,
          event,
          payload: payloadStr,
          statusCode: 0,
          success: false,
          responseBody: err.message?.slice(0, 500) || "Connection failed",
        });
      }
    }));
  } catch (err: any) {
    console.error("[webhook] Delivery error:", err.message);
  }
}
