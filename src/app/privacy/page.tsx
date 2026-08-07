import Link from "next/link";
import { AppFooter } from "@/components/layout/app-footer";
import { auth } from "@/lib/auth";

export const metadata = { title: "Privacy Policy — SoloSuds" };

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
          <p className="mb-8 text-sm text-gray-500">Effective date: August 7, 2026 — Last updated: August 7, 2026</p>

          <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 space-y-6">

            <p>
              SoloSuds, Inc. (&ldquo;SoloSuds,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) provides practice
              management software to independent healthcare practitioners (&ldquo;Practitioners,&rdquo; our
              customers). This Privacy Policy explains what information we collect, how we use it, and the choices
              you have &mdash; both as a Practitioner using the Service and as a Practitioner&rsquo;s client or
              patient (&ldquo;Client&rdquo;) whose information a Practitioner stores in the Service.
            </p>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
              <p>We collect information in three ways:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Account information</strong> you provide when you register: name, email, phone number, business/practice details, and billing information.</li>
                <li><strong>Client information</strong> a Practitioner enters or a Client submits directly, such as name, email, phone number, address, appointment history, intake form responses, and clinical notes.</li>
                <li><strong>Usage information</strong> collected automatically, such as IP address, browser type, device information, and how you interact with the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">2. How We Use Information</h2>
              <p>We use information to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Provide, operate, and maintain the Service, including scheduling, billing, and messaging features.</li>
                <li>Send appointment confirmations, reminders, and account notifications by email and SMS.</li>
                <li>Process payments through our payment processor (Stripe).</li>
                <li>Respond to support requests and improve the Service.</li>
                <li>Comply with legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">3. SMS / Text Messaging</h2>
              <p>
                If you provide a mobile phone number and opt in to receive text messages, we (or the Practitioner
                you booked with) will send appointment confirmations, reminders, and related account notifications
                by SMS. Message frequency varies based on your appointment activity &mdash; typically one to a few
                messages per booking. <strong>Message and data rates may apply.</strong>
              </p>
              <p className="mt-2">
                <strong>Mobile opt-in information and phone numbers collected for SMS purposes are not shared with
                third parties or affiliates for marketing or promotional purposes.</strong> Phone numbers are used
                solely to deliver the transactional messages described above and are shared only with our SMS
                delivery provider (Twilio) as necessary to send those messages.
              </p>
              <p className="mt-2">
                You can opt out of SMS messages at any time by replying <strong>STOP</strong> to any message. Reply{" "}
                <strong>HELP</strong> for assistance. You may also be re-subscribed only by providing express
                consent again (e.g., checking the SMS consent box again or verbally consenting to a Practitioner).
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">4. How We Share Information</h2>
              <p>We do not sell information. We share it only with:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Service providers who help us operate the Service (hosting, email delivery, SMS delivery, payment processing), bound by confidentiality obligations.</li>
                <li>The Practitioner a Client has an appointment or intake relationship with.</li>
                <li>Law enforcement or regulators when required by law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">5. Data Security</h2>
              <p>
                We use industry-standard safeguards, including encryption in transit and at rest, to protect
                information stored in the Service. See our{" "}
                <Link href="/hipaa" className="text-indigo-600 hover:underline">Business Associate Agreement</Link>{" "}
                for details on how we handle protected health information.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">6. Data Retention</h2>
              <p>
                We retain information for as long as an account is active and as needed to provide the Service.
                Upon account cancellation, data remains accessible for 30 days before it may be permanently
                deleted, consistent with our{" "}
                <Link href="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">7. Your Choices</h2>
              <p>
                You may request access to, correction of, or deletion of your information by contacting{" "}
                <a href="mailto:support@solosuds.com" className="text-indigo-600 hover:underline">
                  support@solosuds.com
                </a>. Clients should contact their Practitioner directly, as the Practitioner controls their own
                client records.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">8. Children&rsquo;s Privacy</h2>
              <p>
                The Service is not directed to children under 13, and we do not knowingly collect information from
                children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by
                email or in-app notice.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">10. Contact Us</h2>
              <p>
                Questions about this Privacy Policy? Email{" "}
                <a href="mailto:support@solosuds.com" className="text-indigo-600 hover:underline">
                  support@solosuds.com
                </a>.
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
