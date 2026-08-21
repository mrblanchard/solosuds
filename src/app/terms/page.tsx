import Link from "next/link";
import { AppFooter } from "@/components/layout/app-footer";
import { auth } from "@/lib/auth";

export const metadata = { title: "Terms of Service | SoloSuds" };

export default async function TermsPage() {
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
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mb-8 text-sm text-gray-500">Effective date: January 1, 2026. Last updated: August 10, 2026.</p>

          <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 space-y-6">

            <p>
              Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using SoloSuds. By
              creating an account or using the Service, you agree to be bound by these Terms. If you do not
              agree, do not use the Service.
            </p>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">1. The Service</h2>
              <p>
                Jeremy Blanchard, doing business as SoloSuds (&ldquo;SoloSuds,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) provides a
                cloud-based practice management platform (&ldquo;Service&rdquo;) for healthcare professionals,
                including tools for SOAP notes, scheduling, client management, intake forms, invoicing, and
                secure messaging. The Service is intended for licensed healthcare providers and their authorized
                staff.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">2. Eligibility</h2>
              <p>
                You must be at least 18 years old and a licensed or credentialed healthcare professional (or
                authorized representative of a healthcare organization) to use the Service. By registering, you
                represent that you meet these requirements.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">3. Account Registration</h2>
              <p>
                You are responsible for maintaining the confidentiality of your login credentials and for all
                activity that occurs under your account. You agree to notify us immediately at{" "}
                <a href="mailto:support@solosuds.com" className="text-indigo-600 hover:underline">
                  support@solosuds.com
                </a>{" "}
                of any unauthorized use of your account. We reserve the right to suspend or terminate accounts
                that violate these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">4. Subscription and Billing</h2>
              <p>
                SoloSuds is offered on a subscription basis. Fees are billed in advance on a monthly or annual
                cycle. You authorize us to charge your payment method on file at the start of each billing
                period. All fees are non-refundable except as required by law or as stated in our refund policy.
                We reserve the right to change pricing with 30 days&rsquo; notice.
              </p>
              <p className="mt-2">
                A 14-day free trial is available to new accounts. No credit card is required to start a trial.
                At trial end, continued access requires a paid subscription.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">5. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Use the Service for any unlawful purpose or in violation of any applicable regulations.</li>
                <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure.</li>
                <li>Upload or transmit malware, viruses, or any malicious code.</li>
                <li>Resell, sublicense, or redistribute access to the Service without our written consent.</li>
                <li>Scrape, data-mine, or systematically extract data from the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">6. Data Ownership</h2>
              <p>
                You retain full ownership of all data you input into the Service, including patient records and
                clinical notes. You grant SoloSuds a limited license to process your data solely to provide and
                improve the Service. We will never sell your data or your patients&rsquo; data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">7. Data Export and Portability</h2>
              <p>
                You may export your data at any time from your account settings. Upon cancellation, your data
                will remain accessible for 30 days, after which it may be permanently deleted. We recommend
                exporting your data before canceling.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">8. Uptime and Service Availability</h2>
              <p>
                We target 99.9% monthly uptime and will notify customers of planned maintenance in advance.
                SoloSuds shall not be liable for interruptions due to circumstances beyond our reasonable control,
                including internet outages, third-party service failures, or force majeure events.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">9. Disclaimer of Warranties</h2>
              <p>
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; SoloSuds makes no
                warranties, express or implied, regarding the Service, including warranties of merchantability,
                fitness for a particular purpose, or non-infringement. SoloSuds does not warrant that the Service
                will be error-free or uninterrupted.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">10. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, SoloSuds shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages, or for any loss of profits or data.
                Our total cumulative liability to you shall not exceed the fees paid by you to SoloSuds in the
                12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">11. Termination</h2>
              <p>
                You may cancel your account at any time from your account settings. We reserve the right to
                suspend or terminate your account immediately for violation of these Terms. Upon termination,
                your right to access the Service ceases and we may delete your data in accordance with our
                data retention policy.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">12. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of Delaware, without regard to its conflict of
                law provisions. Any disputes shall be resolved in the state or federal courts located in
                Delaware.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">13. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. We will notify you of material changes by email or
                in-app notice at least 14 days before they take effect. Continued use of the Service after the
                effective date constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">14. Text Messaging (SMS) Terms</h2>
              <p>
                A practitioner using SoloSuds may send appointment-related text messages to their own clients
                through the Service (&ldquo;SoloSuds Appointment Text Notifications&rdquo;). This applies only to
                a client who has actively opted in to receive texts.
              </p>
              <p className="mt-2"><strong>Message types.</strong> Booking confirmations, appointment reminders, reschedule notices, waitlist availability alerts, booking links, intake form links, and direct messages a practitioner sends through the Service, plus a one-time confirmation sent when a client opts in.</p>
              <p className="mt-2"><strong>Message frequency.</strong> Frequency varies based on a client&rsquo;s appointment activity, typically 1 to 4 messages per month.</p>
              <p className="mt-2"><strong>Cost.</strong> Message and data rates may apply, as charged by the client&rsquo;s wireless carrier.</p>
              <p className="mt-2"><strong>Opting out.</strong> A client can reply STOP at any time to stop receiving texts. Reply HELP for help, or contact the practitioner directly. Opting out of texts does not affect a client&rsquo;s appointments or care.</p>
              <p className="mt-2"><strong>Consent is not a condition of service.</strong> A client is never required to opt in to text messages to book or keep an appointment.</p>
              <p className="mt-2">
                Carriers are not liable for delayed or undelivered messages. Supported carriers include the major
                U.S. wireless carriers; coverage and reliability vary by carrier and are not guaranteed by SoloSuds.
              </p>
              <p className="mt-2">
                See our <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link> for
                how phone numbers and message content are handled.
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
