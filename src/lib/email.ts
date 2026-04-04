import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "re_placeholder");
}

export async function sendAppointmentReminder({
  to,
  clientName,
  practitionerName,
  appointmentDate,
  appointmentTime,
  serviceName,
}: {
  to: string;
  clientName: string;
  practitionerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
}) {
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
    `,
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
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return getResend().emails.send({
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}
