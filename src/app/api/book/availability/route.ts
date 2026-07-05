import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/scheduling";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const orgId = searchParams.get("orgId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!orgId || !serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "orgId, serviceId, and date (YYYY-MM-DD) are required" }, { status: 400 });
  }

  const result = await getAvailableSlots({ organizationId: orgId, serviceId, date });
  return NextResponse.json(result);
}
