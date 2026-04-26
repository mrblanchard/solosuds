import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "re_placeholder");
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
  const orgName = branding?.name || "SoloSuds";
  const color = branding?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(branding.primaryColor)
    ? branding.primaryColor
    : "#4f46e5";
  const font = branding?.brandFont || "Inter";
  const logoUrl = branding?.logoUrl;
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

function replyToHeader(branding?: OrgBranding | null): { replyTo?: string } {
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
    <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
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
