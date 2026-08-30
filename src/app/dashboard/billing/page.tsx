import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TableSearch from "@/components/ui/table-search";
import SortHeader from "@/components/ui/sort-header";
import { CreditCard, Plus } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import InvoiceRowActions from "@/components/billing/invoice-row-actions";

const SORT_MAP: Record<string, Prisma.InvoiceOrderByWithRelationInput> = {
  client_asc:  { client: { lastName: "asc" } },
  client_desc: { client: { lastName: "desc" } },
  amount_asc:  { total: "asc" },
  amount_desc: { total: "desc" },
  date_asc:    { createdAt: "asc" },
  date_desc:   { createdAt: "desc" },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId!;
  const params = await searchParams;

  const orderBy = SORT_MAP[params.sort ?? ""] ?? { createdAt: "desc" };

  const [invoices, summary] = await Promise.all([
    db.invoice.findMany({
      where: {
        organizationId: orgId,
        ...(params.status ? { status: params.status as never } : {}),
        ...(params.q
          ? {
              OR: [
                { client: { firstName: { contains: params.q, mode: "insensitive" } } },
                { client: { lastName:  { contains: params.q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { client: { select: { firstName: true, lastName: true } } },
      orderBy,
      take: 50,
    }),
    db.invoice.groupBy({
      by: ["status"],
      _sum: { total: true },
      _count: true,
      where: { organizationId: orgId },
    }),
  ]);

  const summaryMap = Object.fromEntries(
    summary.map((s) => [s.status, { total: s._sum.total ?? 0, count: s._count }])
  );

  const stats = [
    { label: "Outstanding", status: "SENT", color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Overdue", status: "OVERDUE", color: "text-red-600", bg: "bg-red-50" },
    { label: "Paid (All Time)", status: "PAID", color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <Link href="/dashboard/billing/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.status} href={`/dashboard/billing?status=${stat.status}`}>
            <div className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {formatCurrency(summaryMap[stat.status]?.total ?? 0)}
              </p>
              <p className="text-xs text-gray-400">
                {summaryMap[stat.status]?.count ?? 0} invoice{(summaryMap[stat.status]?.count ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Search */}
      <TableSearch placeholder="Search by client name…" className="max-w-sm" />

      {/* Status filter */}
      <div className="flex gap-2 border-b border-gray-200">
        {["", "DRAFT", "SENT", "PAID", "OVERDUE", "VOID"].map((s) => {
          const base = new URLSearchParams();
          if (s) base.set("status", s);
          if (params.q) base.set("q", params.q);
          if (params.sort) base.set("sort", params.sort);
          return (
            <Link
              key={s}
              href={`/dashboard/billing${base.toString() ? `?${base.toString()}` : ""}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                (params.status ?? "") === s
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {s || "All"}
            </Link>
          );
        })}
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <CreditCard className="h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No invoices</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first invoice to get paid.</p>
          <Link href="/dashboard/billing/new" className="mt-4">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Invoice
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Invoice</th>
                <SortHeader field="client" label="Client" />
                <SortHeader field="date" label="Date" />
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Due</th>
                <SortHeader field="amount" label="Amount" />
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="relative px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{inv.number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {inv.client.firstName} {inv.client.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(inv.createdAt, "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {inv.dueDate ? formatDate(inv.dueDate, "MMM d, yyyy") : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="px-6 py-4">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <InvoiceRowActions invoice={{ id: inv.id, status: inv.status, publicToken: inv.publicToken }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "success" | "warning" | "secondary" | "destructive"; label: string }> = {
    DRAFT: { variant: "secondary", label: "Draft" },
    SENT: { variant: "warning", label: "Sent" },
    PAID: { variant: "success", label: "Paid" },
    OVERDUE: { variant: "destructive", label: "Overdue" },
    VOID: { variant: "secondary", label: "Void" },
  };
  const config = map[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
