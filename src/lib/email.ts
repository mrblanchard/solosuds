import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "re_placeholder");
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

export async function sendAppointmentReminder({
  to,
  clientName,
  practitionerName,
  appointmentDate,
  appointmentTime,
  serviceName,
  startDateTime,
  endDateTime,
}: {
  to: string;
  clientName: string;
  practitionerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  startDateTime?: string;
  endDateTime?: string;
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

  return getResend().emails.send({
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject: `Reminder: Your appointment on ${appointmentDate}`,
    html: `
      <h2>Appointment Reminder</h2>
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
    `,
    ...(attachments ? { attachments } : {}),
  });
}

export async function sendIntakeFormLink({
  to,
  clientName,
  formUrl,
}: {
  to: string;
  clientName: string;
  formUrl: string;
}) {
  return getResend().emails.send({
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject: "Please complete your intake form",
    html: `
      <h2>Welcome!</h2>
      <p>Hi ${clientName},</p>
      <p>Please complete your intake form before your first appointment:</p>
      <p><a href="${formUrl}" style="background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Complete Intake Form</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}) {
  return getResend().emails.send({
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
    ...(attachments ? { attachments } : {}),
  });
}
