export interface AltPaymentLinks {
  venmoHandle?: string | null;
  cashAppHandle?: string | null;
  paypalHandle?: string | null;
  squareHandle?: string | null;
  zelleHandle?: string | null;
}

export interface AltPaymentOption {
  label: string;
  /** Present for clickable buttons. */
  url?: string;
  /** Present for methods with no deep link (e.g. Zelle) — shown as plain instructions. */
  instructions?: string;
}

/** Builds clickable/displayable alt payment method options from an org's configured handles. */
export function buildAltPaymentOptions(org: AltPaymentLinks, totalCents: number, invoiceNumber: string): AltPaymentOption[] {
  const amount = (totalCents / 100).toFixed(2);
  const options: AltPaymentOption[] = [];

  if (org.venmoHandle) {
    options.push({
      label: "Pay with Venmo",
      url: `https://venmo.com/${org.venmoHandle}?txn=pay&amount=${amount}&note=${encodeURIComponent(`Invoice #${invoiceNumber}`)}`,
    });
  }
  if (org.cashAppHandle) {
    options.push({ label: "Pay with Cash App", url: `https://cash.app/$${org.cashAppHandle}/${amount}` });
  }
  if (org.paypalHandle) {
    options.push({ label: "Pay with PayPal", url: `https://paypal.me/${org.paypalHandle}/${amount}USD` });
  }
  if (org.squareHandle) {
    options.push({ label: "Pay with Square", url: org.squareHandle });
  }
  if (org.zelleHandle) {
    options.push({ label: "Pay with Zelle", instructions: `Send $${amount} via Zelle to ${org.zelleHandle}` });
  }

  return options;
}
