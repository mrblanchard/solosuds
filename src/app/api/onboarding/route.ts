import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PracticeType } from "@prisma/client";

// Starter services seeded per practice type (price in cents)
const STARTER_SERVICES: Record<PracticeType, { name: string; durationMinutes: number; price: number }[]> = {
  THERAPY: [
    { name: "Swedish Massage (60 min)", durationMinutes: 60, price: 9000 },
    { name: "Deep Tissue (90 min)", durationMinutes: 90, price: 12000 },
    { name: "Initial Assessment", durationMinutes: 60, price: 15000 },
    { name: "Follow-up Session", durationMinutes: 45, price: 8000 },
  ],
  SALON: [
    { name: "Haircut", durationMinutes: 45, price: 5000 },
    { name: "Color & Style", durationMinutes: 120, price: 12000 },
    { name: "Blowout", durationMinutes: 45, price: 4000 },
    { name: "Full Set Nails", durationMinutes: 60, price: 6500 },
  ],
  MEDICAL: [
    { name: "New Patient Consultation", durationMinutes: 60, price: 25000 },
    { name: "Follow-up Visit", durationMinutes: 30, price: 15000 },
    { name: "Annual Wellness Exam", durationMinutes: 60, price: 20000 },
  ],
  FITNESS: [
    { name: "Personal Training (60 min)", durationMinutes: 60, price: 8000 },
    { name: "Group Class", durationMinutes: 60, price: 2500 },
    { name: "Fitness Assessment", durationMinutes: 60, price: 7500 },
  ],
  LESSONS: [
    { name: "30-Minute Lesson", durationMinutes: 30, price: 4000 },
    { name: "60-Minute Lesson", durationMinutes: 60, price: 7000 },
    { name: "Group Class (60 min)", durationMinutes: 60, price: 2500 },
  ],
  OTHER: [],
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, practiceType, noteType } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Practice name is required" }, { status: 400 });
  }

  const type: PracticeType = Object.values(PracticeType).includes(practiceType)
    ? practiceType
    : PracticeType.OTHER;

  // LESSONS defaults to SESSION notes; everything else defaults to SOAP
  const resolvedNoteType =
    noteType === "SESSION" || noteType === "SOAP"
      ? noteType
      : type === PracticeType.LESSONS
      ? "SESSION"
      : "SOAP";

  let org;

  if (session.user.organizationId) {
    // Org was already created during registration — update it with onboarding details
    const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const existing = await db.organization.findMany({
      where: { slug: { startsWith: baseSlug }, NOT: { id: session.user.organizationId } },
      select: { slug: true },
    });
    const slug = existing.length === 0 ? baseSlug : `${baseSlug}-${existing.length}`;

    org = await db.organization.update({
      where: { id: session.user.organizationId },
      data: {
        name: name.trim(),
        slug,
        practiceType: type,
        noteType: resolvedNoteType,
      },
    });
  } else {
    // No org yet — create one
    const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const existing = await db.organization.findMany({ where: { slug: { startsWith: baseSlug } }, select: { slug: true } });
    const slug = existing.length === 0 ? baseSlug : `${baseSlug}-${existing.length}`;

    org = await db.organization.create({
      data: {
        name: name.trim(),
        slug,
        practiceType: type,
        noteType: resolvedNoteType,
      },
    });

    await db.user.update({
      where: { id: session.user.id },
      data: { organizationId: org.id, role: "OWNER" },
    });
  }

  // Seed starter services only if none exist yet for this org
  const existingServices = await db.service.count({ where: { organizationId: org.id } });
  const starterServices = STARTER_SERVICES[type];
  if (starterServices.length > 0 && existingServices === 0) {
    await db.service.createMany({
      data: starterServices.map((s) => ({ ...s, organizationId: org.id })),
    });
  }

  // Create the email consent intake form only if it doesn't exist yet
  const existingConsentForm = await db.intakeForm.findFirst({ where: { organizationId: org.id, isEmailConsent: true } });
  if (!existingConsentForm) {
    await db.intakeForm.create({
    data: {
      organizationId: org.id,
      title: "Email Communication Consent",
      description:
        "Before we communicate with you via email, we need your consent. Standard email is not fully encrypted and may not be HIPAA-secure. Please read and sign below.",
      isEmailConsent: true,
      isActive: true,
      sortOrder: 0,
      fields: [
        {
          id: "ec_heading",
          type: "heading",
          label: "Email Communication Consent",
          required: false,
        },
        {
          id: "ec_risk_info",
          type: "info",
          label: "Please read before signing",
          required: false,
          content: [
            {
              heading: "How email works",
              body: "When you send an email, it travels across the internet through many different computer systems before it reaches its destination, a bit like a postcard being passed from person to person. Unlike a sealed letter, a standard email can potentially be read by others along the way.",
            },
            {
              heading: "What this means for your health information",
              body: "Your provider may want to email you things like appointment reminders, billing questions, or general health information. Because standard email is not fully secure, there is a small chance that someone other than you could read those messages. Your personal health details could be exposed.",
            },
            {
              heading: "What is HIPAA?",
              body: "HIPAA is a federal law that protects your private health information. Fully secure messaging systems use strong encryption (think of it as a combination lock that only you and your provider can open). Standard email, like Gmail, Yahoo, or Outlook, does not always guarantee that same level of protection.",
            },
            {
              heading: "You are in control",
              body: "You do not have to consent. Saying no will not affect your care in any way. If you do consent, you can change your mind at any time, just let your provider know and they will stop sending emails immediately.",
            },
          ],
        },
        {
          id: "ec_name",
          type: "text",
          label: "Your Full Name",
          placeholder: "First and Last Name",
          required: true,
        },
        {
          id: "ec_understand_risk",
          type: "checkbox",
          label:
            "I understand that standard email is not fully encrypted and may not be fully HIPAA-secure. I accept this risk and consent to receiving email communications from this practice.",
          required: true,
        },
        {
          id: "ec_can_revoke",
          type: "checkbox",
          label:
            "I understand that I can ask my provider to stop sending me emails at any time.",
          required: true,
        },
      ],
    },
  });
  }

  return NextResponse.json({ success: true });
}

