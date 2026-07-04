import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Lead } from "@/lib/leads-types";

const DATA_FILE = path.join(process.cwd(), "src/lib/leads-data.json");

export async function readLeads(): Promise<Lead[]> {
  const raw = await readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw) as Lead[];
}

export async function appendLead(lead: Omit<Lead, "id">): Promise<Lead> {
  const leads = await readLeads();
  const id = lead.business
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `lead-${Date.now()}`;

  const newLead: Lead = { id, ...lead };
  const updated = [...leads, newLead];
  await writeFile(DATA_FILE, JSON.stringify(updated, null, 2) + "\n", "utf-8");
  return newLead;
}
