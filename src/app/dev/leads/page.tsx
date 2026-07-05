import { notFound } from "next/navigation";
import LeadsClient from "@/components/dev/leads-client";
import { readLeads } from "@/lib/leads-store";
import { isAdminSession } from "@/lib/admin";

export default async function DevLeadsPage() {
  if (!(await isAdminSession())) notFound();

  const leads = await readLeads();

  return <LeadsClient leads={leads} />;
}
