import { NextResponse } from "next/server";
import { z } from "zod";
import { appendLead } from "@/lib/leads-store";
import { isAdminSession } from "@/lib/admin";

const leadSchema = z.object({
  business: z.string().min(1, "Business name is required").max(200),
  contact: z.string().max(200).optional().or(z.literal("")),
  email: z.string().email("Invalid email").max(254).optional().or(z.literal("")),
  phone: z.string().regex(/^[+]?[\d\s()-]{7,20}$/, "Invalid phone number").optional().or(z.literal("")),
  website: z.string().max(300).optional().or(z.literal("")),
  location: z.string().min(1, "Location is required").max(200),
  software: z.enum(["Fullslate", "Acuity", "MassageBook", "Square", "Mindbody", "None visible", "Unknown"]),
  talkingPoint: z.string().max(1000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { contact, email, phone, website, talkingPoint, ...rest } = parsed.data;
  const lead = await appendLead({
    ...rest,
    contact: contact || null,
    email: email || null,
    phone: phone || null,
    website: website || null,
    talkingPoint: talkingPoint || "",
  });

  return NextResponse.json(lead, { status: 201 });
}
