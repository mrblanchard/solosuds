import Link from "next/link";
import { AppFooter } from "@/components/layout/app-footer";
import { auth } from "@/lib/auth";

export const metadata = { title: "Privacy Policy | SoloSuds" };

export default async function PrivacyPage() {
  const session = await auth();
  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-2">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="SoloSuds" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mb-8 text-sm text-gray-500">Effective date: August 10, 2026. Last updated: August 10, 2026.</p>

          <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 space-y-6">

            <p>
              This Privacy Policy describes how Jeremy Blanchard, doing business as SoloSuds (&ldquo;SoloSuds,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
              collects, uses, and shares information through our appointment-scheduling platform for independent
              healthcare and wellness practitioners (the &ldquo;Service&rdquo;). It applies both to practitioners who
              hold an account and to their clients who interact with a practitioner through the Service, including
              by booking an appointment or receiving text or email notifications.
            </p>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
              <p>We collect:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Practitioner account information:</strong> name, email, phone, business details, and billing information.</li>
                <li><strong>Client information entered by a practitioner or submitted by a client:</strong> name, email address, phone number, appointment details, and, where applicable, clinical or intake information the practitioner chooses to record.</li>
                <li><strong>Communications data:</strong> the content and delivery status of emails and text messages sent through the Service.</li>
                <li><strong>Technical data:</strong> IP address, browser type, and usage data collected automatically to operate and secure the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">2. How We Use Information</h2>
              <p>We use information to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Operate the Service, including scheduling, invoicing, and client management.</li>
                <li>Send transactional emails and text messages a practitioner&rsquo;s client has opted in to receive, such as booking confirmations, appointment reminders, reschedule notices, and waitlist availability alerts.</li>
                <li>Process payments and manage subscriptions.</li>
                <li>Provide customer support and respond to inquiries.</li>
                <li>Maintain the security and integrity of the Service.</li>
              </ul>
              <p className="mt-2">
                We do not use client phone numbers or email addresses for marketing, and we do not sell personal
                information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">3. Text Messaging (SMS)</h2>
              <p>
                A practitioner&rsquo;s client may provide a phone number and opt in to receive appointment text
                messages, either by checking the consent checkbox on the practitioner&rsquo;s online booking page or
                by another method the practitioner discloses at the time of collection. That phone number is used
                only to send the appointment-related texts described in our{" "}
                <Link href="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>, and is
                shared only with our SMS delivery provider (Twilio) as needed to send those messages. No mobile
                information is shared with third parties or affiliates for marketing or promotional purposes. A
                client can withdraw consent at any time by replying STOP, which immediately stops future texts.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">4. Third-Party Service Providers</h2>
              <p>
                We share information with the service providers that operate the Service on our behalf, each bound
                by contract to use information only to provide their service to us. These currently include Twilio
                (text messaging), a transactional email provider, Stripe (payment processing), and our cloud
                hosting and storage providers. We do not permit these providers to use information for their own
                purposes.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">5. Health Information</h2>
              <p>
                Clinical and health information a practitioner records through the Service is handled under the
                terms of our{" "}
                <Link href="/hipaa" className="text-indigo-600 hover:underline">Business Associate Agreement</Link>.
                The practitioner, not SoloSuds, controls what health information is collected and how it is used
                in the course of care.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">6. Data Retention</h2>
              <p>
                We retain information for as long as an account is active and as needed to provide the Service.
                Upon account cancellation, data remains accessible for 30 days and may be permanently deleted
                afterward, consistent with our Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">7. Data Security</h2>
              <p>
                We use industry-standard technical and organizational safeguards, including encryption in transit
                and access controls, to protect information from unauthorized access, disclosure, or loss. No
                system is completely secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">8. Your Choices</h2>
              <p>
                A client can ask their practitioner to stop text or email communications at any time, or reply
                STOP to any text message to opt out immediately. A practitioner can access, correct, or export
                account data at any time from their SoloSuds account, or contact us at{" "}
                <a href="mailto:support@solosuds.com" className="text-indigo-600 hover:underline">support@solosuds.com</a>{" "}
                with questions about their data.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">9. Children&rsquo;s Privacy</h2>
              <p>
                The Service is not directed to children under 13, and we do not knowingly collect personal
                information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify practitioners of material
                changes by email or in-app notice at least 14 days before they take effect.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">11. Contact Us</h2>
              <p>
                Questions about this Privacy Policy can be sent to{" "}
                <a href="mailto:support@solosuds.com" className="text-indigo-600 hover:underline">support@solosuds.com</a>.
              </p>
            </section>

          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          {session?.user?.organizationId ? (
            <Link href="/dashboard" className="text-indigo-600 hover:underline">← Back to dashboard</Link>
          ) : (
            <Link href="/register" className="text-indigo-600 hover:underline">← Back</Link>
          )}
        </p>
      </div>
      <AppFooter />
    </div>
  );
}
