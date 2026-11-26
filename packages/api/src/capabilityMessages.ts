const MESSAGES: Record<string, string> = {
  'orders.read': "This store's API doesn't allow reading orders with your account.",
  'orders.capture': 'Capturing payments from the app needs Spree 5.4+ or the companion gem.',
  'orders.refund': 'Refunds from the app need Spree 5.4+ or the companion gem.',
  'orders.note': 'Order notes need Spree 5.4+ or the companion gem.',
  'analytics.summary': 'Sales summaries need Spree 5.4+ or the companion gem.',
  'notifications.push': 'Push notifications need the companion gem, or Spree webhooks with the relay.',
  'webhooks.manage': "This store's Spree version doesn't support webhooks.",
};

export function capabilityMessage(capability: string): string {
  return MESSAGES[capability] ?? `This store doesn't support "${capability}" yet.`;
}
