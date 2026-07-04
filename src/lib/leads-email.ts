import type { Lead } from "@/lib/leads-types";

const SUPPORT_EMAIL = "support@solosuds.com";
const WEBSITE = "https://solosuds.com";
const SIGNATURE = `Jeremy Blanchard\n603-937-7378\n${SUPPORT_EMAIL}\n${WEBSITE}`;

export function buildEmail(lead: Lead): { subject: string; body: string } {
  const firstName = lead.contact?.split(/[ ,]/)[0] ?? "there";
  const hasSoftware = lead.software !== "None visible" && lead.software !== "Unknown";

  const subject = "Quick question about how you handle scheduling + notes";

  const pitch = hasSoftware
    ? `I saw ${lead.business} uses ${lead.software} for booking. SoloSUDS does that plus SOAP/session notes, intake forms, and invoicing in one place, for about what you're probably already paying.`
    : `I didn't see online booking on your site. Happy to show you a simple option that also handles intake forms and session notes in one place, in case juggling everything by phone or text ever gets old.`;

  const unsubscribeUrl = buildUnsubscribeMailto(lead);

  const body = `Hi ${firstName},

I'm Jeremy Blanchard. I live in the Brattleboro area, and my wife Missy runs MB Massage Studio in Keene, NH. I built her a scheduling and client notes app because she was tired of juggling separate tools for booking, intake forms, and session notes, and I'm now bringing it to other massage therapists nearby.

${pitch}

SoloSUDS is a one person operation, so you'd be talking directly to the person building it, not a call center. You can see more at ${WEBSITE}.

Would you be open to a quick 10 minute look? No pressure either way.

Thanks,
${SIGNATURE}

P.S. If you'd rather not get emails like this, click here to unsubscribe: ${unsubscribeUrl}`;

  return { subject, body };
}

export function mailtoHref(lead: Lead): string | null {
  if (!lead.email) return null;
  const { subject, body } = buildEmail(lead);
  return `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildUnsubscribeMailto(lead: Lead): string {
  const subject = `Unsubscribe: ${lead.business}`;
  const body = `Please remove ${lead.business}${lead.email ? ` (${lead.email})` : ""} from future outreach.`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
