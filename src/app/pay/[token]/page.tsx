import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buildAltPaymentOptions } from "@/lib/alt-payments";
import { AppFooter } from "@/components/layout/app-footer";
import PayWithCardButton from "@/components/pay/pay-with-card-button";

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "default",
  PAID: "success",
  OVERDUE: "destructive",
  VOID: "outline",
};

export default async function PayInvoicePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { paid } = await searchParams;

  const invoice = await db.invoice.findUnique({
    where: { publicToken: token },
    include: {
      client: { select: { firstName: true, lastName: true } },
      organization: {
        select: {
          name: true,
          logoUrl: true,
          primaryColor: true,
          stripeConnectAccountId: true,
          stripeConnectChargesEnabled: true,
          venmoHandle: true,
          cashAppHandle: true,
          paypalHandle: true,
          squareHandle: true,
          zelleHandle: true,
        },
      },
    },
  });

  if (!invoice || invoice.status === "DRAFT" || invoice.status === "VOID") notFound();

  const org = invoice.organization;
  const color = org.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(org.primaryColor)
    ? org.primaryColor
    : "#4f46e5";

  const lineItems = invoice.lineItems as Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  const altPayments = buildAltPaymentOptions(org, invoice.total, invoice.number);
  const isPaid = invoice.status === "PAID";

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          {org.logoUrl && (
            <img src={org.logoUrl} alt={org.name} className="mx-auto h-12 mb-4 object-contain" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <div style={{ background: color }} className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Invoice #{invoice.number}</h2>
              <p className="text-sm text-white/80">
                {invoice.client.firstName} {invoice.client.lastName}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[invoice.status] ?? "secondary"}>{invoice.status}</Badge>
          </div>

          <div className="space-y-4 p-6">
            {invoice.dueDate && (
              <p className="text-sm text-gray-500">Due {formatDate(invoice.dueDate)}</p>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                  <th className="py-2 text-right text-xs font-medium uppercase text-gray-500">Qty</th>
                  <th className="py-2 text-right text-xs font-medium uppercase text-gray-500">Price</th>
                  <th className="py-2 text-right text-xs font-medium uppercase text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-900">{item.description}</td>
                    <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatCurrency(item.total ?? item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100">
                  <td colSpan={3} className="py-3 text-right font-semibold text-gray-900">Total</td>
                  <td className="py-3 text-right text-base font-bold text-gray-900">
                    {formatCurrency(invoice.total)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {invoice.notes && (
              <p className="whitespace-pre-line border-t border-gray-100 pt-4 text-sm text-gray-600">
                {invoice.notes}
              </p>
            )}
          </div>
        </div>

        {isPaid ? (
          <div className="rounded-xl border border-green-100 bg-green-50 p-6 text-center">
            <p className="text-lg font-semibold text-green-700">Paid — thank you!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paid === "1" && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-center text-sm text-indigo-700">
                Payment received — finalizing... this page will update shortly.
              </div>
            )}

            {org.stripeConnectChargesEnabled && (
              <PayWithCardButton token={token} color={color} />
            )}

            {altPayments.length > 0 && (
              <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-6">
                <p className="text-sm font-medium text-gray-700">Other ways to pay</p>
                <div className="flex flex-col gap-2">
                  {altPayments.map((opt) => (
                    opt.url ? (
                      <a
                        key={opt.label}
                        href={opt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {opt.label}
                      </a>
                    ) : (
                      <p key={opt.label} className="rounded-md bg-gray-50 px-4 py-2 text-center text-sm text-gray-600">
                        {opt.instructions}
                      </p>
                    )
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  After paying, {org.name} will mark this invoice as paid.
                </p>
              </div>
            )}
          </div>
        )}

        <AppFooter />
      </div>
    </div>
  );
}
