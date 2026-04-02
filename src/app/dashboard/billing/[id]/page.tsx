import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import InvoiceActions from "@/components/billing/invoice-actions";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "default",
  PAID: "success",
  OVERDUE: "destructive",
  VOID: "outline",
};

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) notFound();

  const invoice = await db.invoice.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      client: true,
      appointment: { select: { id: true, startTime: true } },
    },
  });

  if (!invoice) notFound();

  const lineItems = invoice.lineItems as Array<{
    description: string;
    code?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice #{invoice.number}
            </h1>
            <Badge variant={STATUS_VARIANT[invoice.status] ?? "secondary"}>
              {invoice.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Created {formatDate(invoice.createdAt)}
            {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
          </p>
        </div>
        <Link href="/dashboard/billing">
          <Button variant="outline" size="sm">← Back to Billing</Button>
        </Link>
      </div>

      {/* Client & Linked Records */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-medium uppercase text-gray-400 mb-1">Bill To</p>
          <Link
            href={`/dashboard/clients/${invoice.clientId}`}
            className="font-semibold text-gray-900 hover:text-indigo-600"
          >
            {invoice.client.firstName} {invoice.client.lastName}
          </Link>
          {invoice.client.email && (
            <p className="text-sm text-gray-500">{invoice.client.email}</p>
          )}
          {invoice.client.phone && (
            <p className="text-sm text-gray-500">{invoice.client.phone}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-100 p-4 space-y-2">
          <p className="text-xs font-medium uppercase text-gray-400">Linked To</p>
          {invoice.appointment && (
            <Link
              href={`/dashboard/schedule/${invoice.appointment.id}`}
              className="block text-sm text-indigo-600 hover:underline"
            >
              Appointment · {formatDate(invoice.appointment.startTime)}
            </Link>
          )}
          {!invoice.appointment && (
            <p className="text-sm text-gray-400">None</p>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Unit Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineItems.length > 0 ? (
              lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">
                    {item.description}
                    {item.code && (
                      <span className="ml-2 text-xs text-gray-400">({item.code})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">No line items</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-100">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">Total</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">
                {formatCurrency(invoice.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-medium uppercase text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
        </div>
      )}

      {/* Actions */}
      <InvoiceActions invoice={{ id: invoice.id, status: invoice.status }} />
    </div>
  );
}
