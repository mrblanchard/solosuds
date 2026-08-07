// Shared SMS copy for appointment notifications. Keep this in sync with the sample
// messages registered in the Twilio A2P campaign (Recipient consent > Sample messages) —
// carriers can flag traffic that drifts from what was registered.

interface ConfirmationInput {
  orgName: string;
  serviceName: string;
  date: string;
  time: string;
  link: string;
}

interface ReminderInput {
  orgName: string;
  serviceName: string;
  date: string;
  time: string;
}

interface RescheduleInput {
  orgName: string;
  date: string;
  time: string;
  link: string;
}

export function confirmationSms({ orgName, serviceName, date, time, link }: ConfirmationInput): string {
  return `${orgName}: You're confirmed for ${serviceName} on ${date} at ${time}. Manage: ${link} Reply STOP to opt out.`;
}

export function reminderSms({ orgName, serviceName, date, time }: ReminderInput): string {
  return `${orgName}: Reminder - your ${serviceName} appointment is ${date} at ${time}. Reply STOP to opt out.`;
}

export function rescheduleSms({ orgName, date, time, link }: RescheduleInput): string {
  return `${orgName}: Your appointment was rescheduled to ${date} at ${time}. Details: ${link} Reply STOP to opt out.`;
}
