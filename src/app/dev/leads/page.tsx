import { notFound } from "next/navigation";
import LeadsClient from "@/components/dev/leads-client";
import { readLeads } from "@/lib/leads-store";

export default async function DevLeadsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const leads = await readLeads();

  return <LeadsClient leads={leads} />;
}
