import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function DevSubscribersPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [total, byStatus, byPlan, orgs] = await Promise.all([
    db.organization.count(),
    db.organization.groupBy({ by: ["subscriptionStatus"], _count: true }),
    db.organization.groupBy({ by: ["plan"], _count: true }),
    db.organization.findMany({
      select: {
        name: true,
        slug: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionPeriodEnd: true,
        createdAt: true,
        users: {
          orderBy: { role: "asc" },
          select: { email: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((s) => [s.subscriptionStatus ?? "unknown", s._count]));
  const planCounts = Object.fromEntries(byPlan.map((p) => [p.plan ?? "unknown", p._count]));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscribers</h1>
          <p className="text-sm text-gray-500">Dev-only view, not available in production.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total orgs" value={total} />
          <StatCard label="Active" value={statusCounts.active ?? 0} color="text-green-600" />
          <StatCard label="Trialing" value={statusCounts.trialing ?? 0} color="text-yellow-600" />
          <StatCard label="Canceled" value={statusCounts.canceled ?? 0} color="text-red-600" />
        </div>

        <div className="flex gap-4 text-sm text-gray-600">
          {Object.entries(planCounts).map(([plan, count]) => (
            <span key={plan} className="rounded-full bg-gray-100 px-3 py-1">
              {plan}: {count}
            </span>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Org</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Period end</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map((org) => (
                <tr key={org.slug} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{org.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{org.users[0]?.email ?? "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{org.plan}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{org.subscriptionStatus}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {org.subscriptionPeriodEnd ? formatDate(org.subscriptionPeriodEnd, "MMM d, yyyy") : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(org.createdAt, "MMM d, yyyy")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-gray-900" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
