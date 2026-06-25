import { z } from "zod";
import { BaseResource } from "./base.js";
import { loose } from "../schemas/common.js";
import type { RequestOptions } from "../core/types.js";

/** Webhook event names known at the time of writing (the API may add more). */
export const KNOWN_WEBHOOK_EVENTS = [
  "task.created",
  "offer.accepted",
  "offer.viewed",
  "sale.cancelled",
  "sale.deleted",
  "lead.created",
  "lead.updated",
  "lead.deleted",
  "lead.completed",
  "product.updated",
] as const;

/** A webhook event name. Any string is accepted for forward-compatibility. */
export type WebhookEvent = (typeof KNOWN_WEBHOOK_EVENTS)[number] | (string & {});

export const WebhookSubscriptionSchema = loose({
  uuid: z.string(),
  event: z.string(),
  target_url: z.string(),
  subscribed_at: z.string(),
});
export type WebhookSubscription = z.infer<typeof WebhookSubscriptionSchema>;

export const SubscribeWebhookSchema = z
  .object({
    /** The event to subscribe to, e.g. `"offer.accepted"`. */
    event: z.string(),
    /** The URL Salesdock will POST the event payload to. */
    target_url: z.string().url(),
  })
  .passthrough();
export type SubscribeWebhookInput = z.input<typeof SubscribeWebhookSchema>;

/**
 * Webhooks API — manage event subscriptions. All endpoints use the `account`
 * scope. (Receiving and verifying webhook deliveries happens in your own
 * endpoint; Salesdock POSTs the event payload to your `target_url`.)
 */
export class WebhooksClient extends BaseResource {
  /** List the webhook event types you can subscribe to. */
  listEvents(options?: RequestOptions): Promise<string[]> {
    return this.http.request({
      method: "GET",
      segments: ["account", "webhooks", "events"],
      dataSchema: z.array(z.string()),
      options,
    });
  }

  /** Subscribe a `target_url` to an event. */
  subscribe(input: SubscribeWebhookInput, options?: RequestOptions): Promise<WebhookSubscription> {
    const body = this.parseInput(SubscribeWebhookSchema, input, "webhooks.subscribe");
    return this.http.request({
      method: "POST",
      segments: ["account", "webhooks"],
      dataSchema: WebhookSubscriptionSchema,
      body,
      options,
    });
  }

  /** List your current webhook subscriptions. */
  listSubscriptions(options?: RequestOptions): Promise<WebhookSubscription[]> {
    return this.http.request({
      method: "GET",
      segments: ["account", "webhooks"],
      dataSchema: z.array(WebhookSubscriptionSchema),
      options,
    });
  }

  /** Unsubscribe by subscription UUID. */
  unsubscribe(uuid: string, options?: RequestOptions): Promise<unknown> {
    return this.http.request({
      method: "DELETE",
      segments: ["account", "webhooks", uuid],
      dataSchema: z.unknown(),
      options,
    });
  }
}
