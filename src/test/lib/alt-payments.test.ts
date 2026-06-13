/**
 * Tests for buildAltPaymentOptions — alt payment link builders
 */

import { buildAltPaymentOptions } from "@/lib/alt-payments";

describe("buildAltPaymentOptions", () => {
  it("returns an empty array when no handles are configured", () => {
    expect(buildAltPaymentOptions({}, 10000, "00001")).toEqual([]);
  });

  it("builds a Venmo deep link with amount and invoice note", () => {
    const options = buildAltPaymentOptions({ venmoHandle: "jane-doe" }, 12345, "00007");
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe("Pay with Venmo");
    expect(options[0].url).toBe(
      "https://venmo.com/jane-doe?txn=pay&amount=123.45&note=Invoice%20%2300007"
    );
    expect(options[0].instructions).toBeUndefined();
  });

  it("builds a Cash App link with leading $", () => {
    const options = buildAltPaymentOptions({ cashAppHandle: "janedoe" }, 5000, "00001");
    expect(options[0].url).toBe("https://cash.app/$janedoe/50.00");
  });

  it("builds a PayPal.me link with USD suffix", () => {
    const options = buildAltPaymentOptions({ paypalHandle: "janedoe" }, 2500, "00001");
    expect(options[0].url).toBe("https://paypal.me/janedoe/25.00USD");
  });

  it("passes through a Square payment link as-is", () => {
    const url = "https://square.link/u/abc123";
    const options = buildAltPaymentOptions({ squareHandle: url }, 1000, "00001");
    expect(options[0].url).toBe(url);
  });

  it("builds Zelle instructions with no clickable url", () => {
    const options = buildAltPaymentOptions({ zelleHandle: "jane@example.com" }, 1000, "00001");
    expect(options[0].url).toBeUndefined();
    expect(options[0].instructions).toBe("Send $10.00 via Zelle to jane@example.com");
  });

  it("includes one entry per configured handle, in order", () => {
    const options = buildAltPaymentOptions(
      {
        venmoHandle: "venmo-user",
        cashAppHandle: "cashapp-user",
        paypalHandle: "paypal-user",
        squareHandle: "https://square.link/u/abc",
        zelleHandle: "zelle@example.com",
      },
      10000,
      "00001"
    );
    expect(options.map((o) => o.label)).toEqual([
      "Pay with Venmo",
      "Pay with Cash App",
      "Pay with PayPal",
      "Pay with Square",
      "Pay with Zelle",
    ]);
  });

  it("ignores null/undefined handles", () => {
    const options = buildAltPaymentOptions(
      { venmoHandle: null, cashAppHandle: undefined, paypalHandle: "janedoe" },
      1000,
      "00001"
    );
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe("Pay with PayPal");
  });
});
