import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const sections = [
  {
    title: "Getting Started",
    items: [
      {
        q: "How do I set up my practice?",
        a: "After signing up, you'll go through a quick onboarding flow where you choose your practice type (therapy, salon, medical, fitness, or other) and name your practice. This creates your organization and seeds starter services. You can change everything later in Settings.",
      },
      {
        q: "How do I invite team members?",
        a: "Go to Settings and share your registration link with team members. When they sign up, they can be added to your organization. Owners and admins can manage team roles.",
      },
      {
        q: "What are the different user roles?",
        a: "OWNER has full access to all settings, billing, and team management. ADMIN can manage organization settings and services. PRACTITIONER can manage their own clients, notes, and appointments. STAFF has limited access for front-desk operations.",
      },
    ],
  },
  {
    title: "Dashboard",
    items: [
      {
        q: "How do I customize my dashboard?",
        a: "Your dashboard uses draggable, resizable widgets. Hover over any section to see the drag handle (grip icon) and drag it to rearrange. You can also hide sections by clicking the X button that appears on hover. Use the \"Manage Sections\" button to show or hide specific widgets.",
      },
      {
        q: "What widgets are available?",
        a: "The dashboard includes: client & appointment counts, today's schedule, quick actions, task manager, recent notes, upcoming appointments, and recent messages. Each can be independently shown, hidden, and rearranged.",
      },
      {
        q: "How does the task manager work?",
        a: "The task manager lets you create to-dos with titles, descriptions, and priorities (Low, Medium, High, Urgent). Click the status icon on any task to cycle through Todo → In Progress → Done. Click a task to expand it and edit the description. Use the filter tabs to view tasks by status.",
      },
    ],
  },
  {
    title: "Clients",
    items: [
      {
        q: "How do I add a new client?",
        a: 'Click "Add Client" on the Clients page. Fill in personal info (name, DOB, gender, pronouns), contact info (email, phone, address with autocomplete), emergency contact, and internal notes. Tags help you organize clients into categories.',
      },
      {
        q: "Can I import clients from a CSV?",
        a: 'Yes! Click "Import CSV" on the Clients page. Upload a CSV file with headers like "First Name", "Last Name", "Email", "Phone", etc. The system auto-detects common column names and lets you map any unrecognized columns. You can import up to 500 clients at once.',
      },
      {
        q: "How do I search and filter clients?",
        a: "Use the search bar to find clients by name, email, or phone. Filter by status (Active, Inactive, Archived) using the pills below the search bar. Sort by name or date added using the column headers.",
      },
      {
        q: "What does archiving a client do?",
        a: "Archiving sets the client's status to ARCHIVED but preserves all their records (notes, appointments, invoices). Archived clients don't appear in the default list but can be found using the status filter.",
      },
    ],
  },
  {
    title: "Appointments & Scheduling",
    items: [
      {
        q: "How do I book an appointment?",
        a: 'Go to the Schedule page and click on a time slot in the calendar, or use the "Book" button. Select a client, practitioner, service, and time. Toggle the reminder switch to automatically email the client a confirmation.',
      },
      {
        q: "Can clients book their own appointments?",
        a: "Yes! Each organization gets a public booking page. Share your booking link with clients and they can select a service, choose an available time slot, and book themselves in. The link is available from your dashboard.",
      },
      {
        q: "What happens when an appointment is created?",
        a: "When you create an appointment: (1) An email reminder is sent to the client if they have an email on file, (2) A draft note is automatically created for the session, and (3) If you've set a default intake form in Settings, it's automatically emailed to the client.",
      },
      {
        q: "How do I reschedule or cancel?",
        a: "Click on any appointment in the calendar to view its details. From there you can edit the time, change the status to cancelled, or delete it. Drag and drop on the calendar to quickly reschedule.",
      },
    ],
  },
  {
    title: "Notes",
    items: [
      {
        q: "What's the difference between SOAP notes and Session notes?",
        a: "SOAP notes use a structured four-section format: Subjective (patient-reported symptoms), Objective (measurable findings), Assessment (clinical interpretation), and Plan (treatment plan). Session notes use a single free-form text area for more flexible documentation. Choose your preference in Settings under Organization → Note Format.",
      },
      {
        q: "How do I create a note?",
        a: 'Go to Notes and click "New Note". Select the client and session date. If you\'re using SOAP format, fill in the S, O, A, P sections. For session notes, write your documentation in the free-form field. Add ICD-10 diagnosis codes and CPT procedure codes in the Billing Codes section.',
      },
      {
        q: "What do the note statuses mean?",
        a: "DRAFT: Work in progress, fully editable. SIGNED: You've signed it (records who signed and when), still editable. LOCKED: Finalized and read-only — cannot be edited or deleted. AMENDED: A locked note that has been amended.",
      },
      {
        q: "Can I duplicate a note?",
        a: 'Yes! On any existing note, click "Duplicate Note" to create a new note with the same content. This is useful for recurring sessions with similar documentation.',
      },
      {
        q: "How do I switch between SOAP and Session notes?",
        a: "Go to Settings → Organization → Note Format and select either SOAP Notes or Session Notes. New notes will use the selected format. Existing notes keep their original format.",
      },
    ],
  },
  {
    title: "Intake Forms",
    items: [
      {
        q: "How do I create an intake form?",
        a: 'Go to the Intake Forms page and click "New Form". Give it a title and description, then add fields by dragging from the field palette. Available field types include text, textarea, select, checkbox, radio, date, and file upload. Reorder fields by dragging them.',
      },
      {
        q: "How do I send an intake form to a client?",
        a: 'Click the "Copy Link" button on any form to get a shareable link. You can also set a default intake form in Settings → Organization → Default Intake Form, and it will be automatically emailed to clients when appointments are created.',
      },
      {
        q: "How do I view submissions?",
        a: 'On the Intake Forms page, click "Submissions" for any form. You\'ll see all responses organized by client, with field labels and answers displayed in card format.',
      },
      {
        q: "Can I duplicate a form?",
        a: 'Yes! Use the "Duplicate" action on any form to create a copy with all the same fields. This is useful for creating variations of existing forms.',
      },
    ],
  },
  {
    title: "Messages",
    items: [
      {
        q: "How does messaging work?",
        a: "SoapSuds supports SMS messaging through Twilio. You can send text messages to clients directly from the Messages page. When clients reply, their messages appear in your inbox in real-time.",
      },
      {
        q: "Can I get notified when a client replies?",
        a: "Yes! Go to Settings → Your Profile → SMS Notifications and enter a phone number. When clients reply via text, the message will be forwarded to your phone and you'll receive an email notification with the message content.",
      },
      {
        q: "How do I send a message?",
        a: "Go to Messages, select a client from the conversation list (or start a new conversation), type your message, and send. Messages are sent as SMS through your organization's Twilio number.",
      },
    ],
  },
  {
    title: "Email Consent",
    items: [
      {
        q: "What is email consent and why do I need it?",
        a: "Standard email is not fully encrypted — it travels through multiple servers before reaching its destination, and could theoretically be read by others along the way. Under HIPAA, sending protected health information via standard email requires that the patient understands this risk and explicitly consents. SoapSuds enforces this by gating all email communication behind a signed consent form.",
      },
      {
        q: "How does the email consent flow work?",
        a: "When you first try to email a client, SoapSuds will show a prompt to send them a consent form. The client receives a branded email with a link to a plain-English form explaining the risks of email communication. Once they check the boxes and submit, their status updates to Consented and you can email them freely.",
      },
      {
        q: "What are the consent statuses?",
        a: "NONE: No consent form has been sent yet. PENDING: The consent form was sent and you're waiting for the client to sign it. CONSENTED: The client has signed — email is unlocked. REVOKED: You have revoked email access for this client (see below).",
      },
      {
        q: "How do I send the consent form?",
        a: "Open the email thread for a client (Dashboard → Email → select the client). If they haven't consented, you'll see a notice at the bottom with a \"Send Consent Form\" button. Click it — the client will receive an email with a link to the consent form. You can resend it at any time if they haven't responded.",
      },
      {
        q: "Can I revoke a client's email consent?",
        a: "Yes. Open the client's email thread and click \"Revoke Access\" in the header (only visible when the client is Consented). This immediately blocks email until you send them a new consent form and they sign it again. This is useful if a client requests to stop receiving emails.",
      },
      {
        q: "Can I delete the consent form or a signed submission?",
        a: "No — this is intentional. The Email Communication Consent form cannot be deleted from your intake forms list. Signed consent submissions are permanently protected and will never be removed, even if you permanently delete the client record. This is an important audit trail.",
      },
    ],
  },
  {
    title: "Client Document Portal",
    items: [
      {
        q: "What is the client document portal?",
        a: "The client document portal is a secure, password-free web page where your clients can upload documents to you and download documents you've shared with them. It's accessible at your practice's portal link — for example: app.soapsuds.app/portal/your-practice-name.",
      },
      {
        q: "How do clients access the portal without an account?",
        a: "Clients don't need to create an account. They go to your portal link and enter the email address or phone number you have on file for them. SoapSuds sends a 6-digit verification code to that address. Once they enter the code, they're in. The code expires in 15 minutes and can only be used once.",
      },
      {
        q: "How do I share the portal link with a client?",
        a: "Go to the client's profile page and scroll to the Documents section. Click \"Copy portal link\" — this copies your practice's portal URL to your clipboard. You can paste it into an email, text, or any message to the client.",
      },
      {
        q: "How do I share a document WITH a client?",
        a: "In the Documents section on a client's profile page, click \"Share file\". Select the file from your computer. It will be uploaded to secure storage and the client will be able to download it the next time they log in to the portal.",
      },
      {
        q: "How does a client upload a document to me?",
        a: "The client visits your portal link, verifies their identity with a one-time code, and then sees an \"Upload a document\" section with a \"Choose file\" button. Files they upload appear in the Documents section on their profile in your dashboard, labelled \"From client\".",
      },
      {
        q: "Are the documents secure and HIPAA-compliant?",
        a: "Yes. All files are stored in Cloudflare R2 with AES-256 encryption at rest. All data is encrypted in transit with HTTPS/TLS. Files are never accessible via a permanent public URL — every download goes through the server, which verifies authorization and generates a signed URL that expires after 15 minutes. Every upload and download is recorded in an audit log.",
      },
      {
        q: "What file types and sizes are supported?",
        a: "The portal accepts PDF, Word documents (.doc, .docx), images (JPG, PNG, GIF, TIFF, HEIC), plain text, and CSV files. Maximum file size is 25 MB per file.",
      },
      {
        q: "Can clients delete their own uploads?",
        a: "Yes — clients can delete files they uploaded themselves from the portal. They cannot delete files that were shared with them by the practice. Practitioners can delete any document from the client profile in the dashboard.",
      },
      {
        q: "Can I see a record of who accessed which files?",
        a: "Every upload and download is logged with a timestamp and whether it was the client or a practitioner. This audit trail is stored permanently in the database and is available for compliance purposes.",
      },
    ],
  },
  {
    title: "Billing & Invoices",
    items: [
      {
        q: "How do I create an invoice?",
        a: 'Go to Billing and click "New Invoice". Select the client and appointment, set line items with descriptions and amounts, and save. Invoices can be sent to clients via email with a payment link.',
      },
      {
        q: "How do payments work?",
        a: "SoapSuds integrates with Stripe for payment processing. Clients can pay invoices online using credit/debit cards. Payment status is tracked automatically and updated via webhooks.",
      },
      {
        q: "What invoice statuses are there?",
        a: "DRAFT: Not yet sent. SENT: Emailed to client. PAID: Payment received. OVERDUE: Past due date without payment. VOID: Cancelled invoice.",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        q: "How do I change my password?",
        a: "Go to Settings → Your Profile → Change Password. Enter your current password and your new password. Passwords must be at least 12 characters with a mix of uppercase, lowercase, numbers, and special characters.",
      },
      {
        q: "How do I manage my services?",
        a: "Go to Settings → Services. You can add, edit, or deactivate services. Each service has a name, description, duration, price, and optional color. Active services appear in your booking form and appointment creation.",
      },
      {
        q: "How do I change the color theme?",
        a: "Go to Settings → Color Theme. Choose from six themes: Lavender (default), Ocean, Sage, Rose, Sunset, or Slate. The theme applies immediately across the entire app.",
      },
      {
        q: "How do I set a default intake form?",
        a: "Go to Settings → Organization → Default Intake Form. Select an active intake form from the dropdown. When new appointments are created, this form will be automatically emailed to the client.",
      },
    ],
  },
  {
    title: "Account & Subscription",
    items: [
      {
        q: "What plans are available?",
        a: "SoapSuds offers a free trial, then monthly or annual subscription plans. Visit the Billing page in your dashboard to view plans, upgrade, or manage your subscription.",
      },
      {
        q: "How do I cancel or pause my subscription?",
        a: "Go to Dashboard → Billing → Membership. You can pause your subscription (which stops billing temporarily) or cancel it entirely. When paused, you can resume at any time.",
      },
      {
        q: "Is my data HIPAA compliant?",
        a: "SoapSuds is designed with HIPAA compliance in mind. We use encrypted connections, secure authentication, and follow best practices for protecting health information. Review our HIPAA notice and Terms of Service via the links in the footer.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & FAQ</h1>
        <p className="text-gray-500 mb-10">
          Everything you need to know about using SoapSuds. Can't find what you're looking for?
          Email us at{" "}
          <a href="mailto:support@soapsuds.app" className="text-indigo-600 hover:underline">
            support@soapsuds.app
          </a>
        </p>

        {/* Table of contents */}
        <nav className="mb-12 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Navigation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sections.map((s) => (
              <a
                key={s.title}
                href={`#${s.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                <ChevronRight className="h-3 w-3" />
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        {/* FAQ sections */}
        <div className="space-y-12">
          {sections.map((section) => (
            <div key={section.title} id={section.title.toLowerCase().replace(/\s+/g, "-")}>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <details key={item.q} className="group rounded-xl border border-gray-200 bg-white">
                    <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-xl">
                      {item.q}
                      <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Still need help?</h3>
          <p className="text-sm text-gray-600 mb-4">Our support team is here to assist you.</p>
          <a
            href="mailto:support@soapsuds.app"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
