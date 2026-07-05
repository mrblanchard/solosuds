import { Resend } from "resend";
import type { AltPaymentOption } from "@/lib/alt-payments";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "re_placeholder");
}

/** Escapes a string for safe interpolation into HTML text or attribute values. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface OrgBranding {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  brandFont?: string | null;
  emailSignature?: string | null;
  replyToEmail?: string | null;
}

/** Wraps email body HTML in a branded template with logo, font, and signature. */
export function buildBrandedEmail(content: string, branding?: OrgBranding | null): string {
  const orgName = escapeHtml(branding?.name || "SoloSuds");
  const color = branding?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(branding.primaryColor)
    ? branding.primaryColor
    : "#4f46e5";
  const font = branding?.brandFont || "Inter";
  const logoUrl = branding?.logoUrl ? escapeHtml(branding.logoUrl) : null;
  const signature = branding?.emailSignature;

  const safeFontName = font.replace(/[^a-zA-Z0-9 ]/g, "");
  const fontImport = `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(safeFontName)}:wght@400;500;600&display=swap');`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${fontImport}</style>
</head>
<body style="margin:0;padding:16px;background:#f9fafb;">
  <div style="font-family:'${safeFontName}',system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${color};padding:24px 32px;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="height:40px;max-width:180px;object-fit:contain;display:block;margin-bottom:${logoUrl ? "10px" : "0"};"/>` : ""}
      <h1 style="color:white;margin:0;font-size:20px;font-weight:600;font-family:'${safeFontName}',system-ui,sans-serif;">${orgName}</h1>
    </div>
    <div style="padding:32px;font-family:'${safeFontName}',system-ui,sans-serif;color:#111827;line-height:1.6;">
      ${content}
      ${signature
        ? `<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;font-size:14px;color:#374151;">${signature}</div>`
        : ""}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Sent via <strong>${orgName}</strong></p>
    </div>
  </div>
</body>
</html>`;
}

// Format a Date to the iCalendar UTC datetime format: 20260412T140000Z
function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildGoogleCalendarUrl(title: string, description: string, start: Date, end: Date): string {
  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${toIcsDate(start)}/${toIcsDate(end)}` +
    `&details=${encodeURIComponent(description)}`
  );
}

function buildOutlookCalendarUrl(title: string, description: string, start: Date, end: Date): string {
  return (
    "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
    `&subject=${encodeURIComponent(title)}` +
    `&startdt=${start.toISOString()}` +
    `&enddt=${end.toISOString()}` +
    `&body=${encodeURIComponent(description)}`
  );
}

function buildIcsContent(title: string, description: string, start: Date, end: Date): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SoloSuds//EN",
    "BEGIN:VEVENT",
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function replyToHeader(branding?: OrgBranding | null): { replyTo?: string } {
  const r = branding?.replyToEmail?.trim();
  return r ? { replyTo: r } : {};
}

export async function sendAppointmentReminder({
  to,
  clientName,
  practitionerName,
  appointmentDate,
  appointmentTime,
  serviceName,
  startDateTime,
  endDateTime,
  branding,
  manageUrl,
}: {
  to: string;
  clientName: string;
  practitionerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  startDateTime?: string;
  endDateTime?: string;
  branding?: OrgBranding | null;
  manageUrl?: string;
}) {
  const eventTitle = `${serviceName} with ${practitionerName}`;
  const eventDescription = `Service: ${serviceName}\nPractitioner: ${practitionerName}\nDate: ${appointmentDate}\nTime: ${appointmentTime}`;

  let calendarSection = "";
  let attachments: Array<{ filename: string; content: Buffer }> | undefined;

  if (startDateTime && endDateTime) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    const googleUrl = buildGoogleCalendarUrl(eventTitle, eventDescription, start, end);
    const outlookUrl = buildOutlookCalendarUrl(eventTitle, eventDescription, start, end);

    calendarSection = `
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Add to your calendar:</p>
        <a href="${googleUrl}" style="display:inline-block;margin-right:8px;margin-bottom:8px;padding:8px 16px;background-color:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">Google Calendar</a>
        <a href="${outlookUrl}" style="display:inline-block;margin-right:8px;margin-bottom:8px;padding:8px 16px;background-color:#0078d4;color:white;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">Outlook</a>
        <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Apple Calendar users: open the attached .ics file.</p>
      </div>
    `;

    attachments = [
      {
        filename: "appointment.ics",
        content: Buffer.from(buildIcsContent(eventTitle, eventDescription, start, end), "utf-8"),
      },
    ];
  }

  const content = `
    <h2 style="margin-top:0;">Appointment Reminder</h2>
    <p>Hi ${clientName},</p>
    <p>This is a reminder for your upcoming appointment:</p>
    <ul>
      <li><strong>Service:</strong> ${serviceName}</li>
      <li><strong>Practitioner:</strong> ${practitionerName}</li>
      <li><strong>Date:</strong> ${appointmentDate}</li>
      <li><strong>Time:</strong> ${appointmentTime}</li>
    </ul>
    ${manageUrl
      ? `<p><a href="${manageUrl}" style="color:#4f46e5;">Reschedule or cancel this appointment</a></p>`
      : `<p>If you need to reschedule or cancel, please contact us as soon as possible.</p>`}
    ${calendarSection}
  `;

  return getResend().emails.send({
    from: `${branding?.name || process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject: `Reminder: Your appointment on ${appointmentDate}`,
    html: buildBrandedEmail(content, branding),
    ...(attachments ? { attachments } : {}),
    ...replyToHeader(branding),
  });
}

export async function sendWaitlistOpening({
  to,
  clientName,
  bookingUrl,
  branding,
}: {
  to: string;
  clientName: string;
  bookingUrl: string;
  branding?: OrgBranding | null;
}) {
  const content = `
    <h2 style="margin-top:0;">A spot opened up!</h2>
    <p>Hi ${clientName},</p>
    <p>A time slot just became available. Since you're on the waitlist, we wanted to give you first chance to grab it.</p>
    <p><a href="${bookingUrl}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Book This Spot</a></p>
    <p style="font-size:14px;color:#6b7280;">Spots like this tend to go fast, first come, first served.</p>
  `;
  return getResend().emails.send({
    from: `${branding?.name || process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject: "A spot just opened up",
    html: buildBrandedEmail(content, branding),
    ...replyToHeader(branding),
  });
}

export async function sendIntakeFormLink({
  to,
  clientName,
  formUrl,
  branding,
}: {
  to: string;
  clientName: string;
  formUrl: string;
  branding?: OrgBranding | null;
}) {
  const color = branding?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(branding.primaryColor)
    ? branding.primaryColor
    : "#4f46e5";
  const content = `
    <h2 style="margin-top:0;">Welcome!</h2>
    <p>Hi ${clientName},</p>
    <p>Please complete your intake form before your first appointment:</p>
    <p><a href="${formUrl}" style="display:inline-block;background:${color};color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Complete Intake Form</a></p>
    <p style="font-size:14px;color:#6b7280;">This link expires in 7 days.</p>
  `;
  return getResend().emails.send({
    from: `${branding?.name || process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject: "Please complete your intake form",
    html: buildBrandedEmail(content, branding),
    ...replyToHeader(branding),
  });
}

export async function sendThankYouEmail({
  to,
  clientName,
  practitionerName,
  sessionDate,
  branding,
}: {
  to: string;
  clientName: string;
  practitionerName: string;
  sessionDate: string;
  branding?: OrgBranding | null;
}) {
  const content = `
    <h2 style="margin-top:0;">Thank You!</h2>
    <p>Hi ${clientName},</p>
    <p>Thank you for your session on <strong>${sessionDate}</strong>. It was a pleasure working with you.</p>
    <p>If you have any questions or need to schedule your next appointment, please don't hesitate to reach out.</p>
    <p>Looking forward to seeing you again!</p>
    <p style="margin-top:24px;">Warm regards,<br/>${practitionerName}</p>
  `;
  return getResend().emails.send({
    from: `${branding?.name || process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject: `Thank you for your session — ${sessionDate}`,
    html: buildBrandedEmail(content, branding),
    ...replyToHeader(branding),
  });
}

export async function sendInvoiceEmail({
  to,
  clientName,
  invoiceNumber,
  total,
  dueDate,
  payUrl,
  altPayments,
  branding,
}: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  total: number; // cents
  dueDate?: string | null;
  payUrl: string;
  altPayments: AltPaymentOption[];
  branding?: OrgBranding | null;
}) {
  const color = branding?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(branding.primaryColor)
    ? branding.primaryColor
    : "#4f46e5";
  const amount = (total / 100).toFixed(2);

  const altSection = altPayments.length
    ? `
    <p style="margin-top:24px;font-size:14px;color:#6b7280;">Other ways to pay:</p>
    <ul style="font-size:14px;color:#374151;">
      ${altPayments.map((o) => o.url
        ? `<li><a href="${o.url}">${o.label}</a></li>`
        : `<li>${o.instructions}</li>`
      ).join("")}
    </ul>`
    : "";

  const content = `
    <h2 style="margin-top:0;">Invoice #${invoiceNumber}</h2>
    <p>Hi ${clientName},</p>
    <p>You have a new invoice for <strong>$${amount}</strong>${dueDate ? ` due ${dueDate}` : ""}.</p>
    <p><a href="${payUrl}" style="display:inline-block;background:${color};color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View &amp; Pay Invoice</a></p>
    ${altSection}
  `;

  const subject = `Invoice #${invoiceNumber} from ${branding?.name || process.env.FROM_NAME}`;
  const html = buildBrandedEmail(content, branding);

  const result = await getResend().emails.send({
    from: `${branding?.name || process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
    ...replyToHeader(branding),
  });

  return { subject, html, result };
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  replyTo,
  fromName,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
  replyTo?: string;
  fromName?: string;
}) {
  return getResend().emails.send({
    from: `${fromName || process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
    ...(attachments ? { attachments } : {}),
    ...(replyTo ? { replyTo } : {}),
  });
}

/** Sends an internal alert to ADMIN_NOTIFICATION_EMAIL. No-op if unset; never throws. */
async function sendAdminNotification(subject: string, html: string) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) return;
  try {
    await getResend().emails.send({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[sendAdminNotification]", err);
  }
}

/** Notifies the admin when a new organization signs up for a trial. */
export async function notifyTrialSignup(params: { orgName: string; ownerName: string; ownerEmail: string }) {
  const { orgName, ownerName, ownerEmail } = params;
  await sendAdminNotification(
    `New trial signup: ${orgName}`,
    `<p><strong>${escapeHtml(orgName)}</strong> just started a free trial.</p>
<p>Owner: ${escapeHtml(ownerName)} (${escapeHtml(ownerEmail)})</p>`
  );
}

/** Notifies the admin when an organization converts from trial to a paid subscription. */
export async function notifyConversion(params: { orgName: string; plan: string }) {
  const { orgName, plan } = params;
  await sendAdminNotification(
    `New paid subscription: ${orgName}`,
    `<p><strong>${escapeHtml(orgName)}</strong> just converted to a paid <strong>${escapeHtml(plan)}</strong> plan.</p>`
  );
}
