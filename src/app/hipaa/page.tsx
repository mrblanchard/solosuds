import Link from "next/link";
import { AppFooter } from "@/components/layout/app-footer";
import { auth } from "@/lib/auth";

export const metadata = { title: "Business Associate Agreement — SoloSuds" };

export default async function HipaaPage() {
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
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Business Associate Agreement</h1>
          <p className="mb-8 text-sm text-gray-500">Effective date: January 1, 2025 — Last updated: January 1, 2025</p>

          <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 space-y-6">

            <p>
              This Business Associate Agreement (&ldquo;BAA&rdquo;) is entered into between SoloSuds, Inc.
              (&ldquo;Business Associate&rdquo;) and the healthcare provider or covered entity that creates an
              account (&ldquo;Covered Entity&rdquo;). This BAA is incorporated into and forms part of the
              SoloSuds Terms of Service.
            </p>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">1. Definitions</h2>
              <p>
                Terms used but not otherwise defined in this BAA shall have the meanings ascribed to them under the
                Health Insurance Portability and Accountability Act of 1996 (&ldquo;HIPAA&rdquo;), the Health
                Information Technology for Economic and Clinical Health Act (&ldquo;HITECH&rdquo;), and their
                implementing regulations (collectively, the &ldquo;HIPAA Rules&rdquo;).
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Protected Health Information (PHI)</strong> — individually identifiable health information transmitted or maintained in any form or medium.</li>
                <li><strong>Electronic PHI (ePHI)</strong> — PHI that is created, received, maintained, or transmitted electronically.</li>
                <li><strong>Breach</strong> — acquisition, access, use, or disclosure of PHI in a manner not permitted under the HIPAA Privacy Rule that compromises the security or privacy of the PHI.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">2. Obligations of Business Associate</h2>
              <p>SoloSuds agrees to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Not use or disclose PHI other than as permitted by this BAA or required by law.</li>
                <li>Use appropriate safeguards, and comply with the HIPAA Security Rule with respect to ePHI, to prevent unauthorized use or disclosure of PHI.</li>
                <li>Report to the Covered Entity any use or disclosure of PHI not provided for by this BAA, including any security incident or breach, without unreasonable delay and in no case later than 60 days after discovery.</li>
                <li>Ensure that any subcontractors that create, receive, maintain, or transmit PHI on its behalf agree to the same restrictions and conditions.</li>
                <li>Make PHI available for access, amendment, and accounting of disclosures as required by the HIPAA Rules.</li>
                <li>Return or destroy all PHI upon termination of the agreement, where feasible.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">3. Permitted Uses and Disclosures</h2>
              <p>SoloSuds may use or disclose PHI only to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Perform the services described in the Terms of Service on behalf of the Covered Entity.</li>
                <li>Provide data aggregation services relating to the health care operations of the Covered Entity.</li>
                <li>Comply with a legal obligation.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">4. Obligations of Covered Entity</h2>
              <p>The Covered Entity agrees to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Notify SoloSuds of any restriction on the use or disclosure of PHI that the Covered Entity has agreed to with individuals.</li>
                <li>Not request SoloSuds to use or disclose PHI in any manner that would violate the HIPAA Rules.</li>
                <li>Obtain all necessary authorizations from patients before submitting PHI through the platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">5. Security Measures</h2>
              <p>
                SoloSuds maintains industry-standard administrative, physical, and technical safeguards to protect
                ePHI, including but not limited to: AES-256 encryption at rest, TLS 1.2+ in transit, role-based
                access controls, audit logging, and regular security assessments. Data is hosted on SOC 2
                Type II certified infrastructure.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">6. Breach Notification</h2>
              <p>
                In the event of a breach of unsecured PHI, SoloSuds will notify the Covered Entity without
                unreasonable delay and no later than 60 calendar days after discovery. Notification will include,
                to the extent possible: the identification of affected individuals; a description of the breach;
                types of PHI involved; steps individuals should take; and remediation steps taken by SoloSuds.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">7. Term and Termination</h2>
              <p>
                This BAA is effective upon account creation and remains in effect for the duration of the
                service relationship. Either party may terminate if the other party materially breaches this BAA
                and fails to cure within 30 days of written notice. Upon termination, SoloSuds will return or
                destroy all PHI in its possession within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">8. Governing Law</h2>
              <p>
                This BAA shall be governed by and construed in accordance with applicable federal law, including
                HIPAA and HITECH. To the extent state law provides greater protection, state law shall apply.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">9. Contact</h2>
              <p>
                Questions regarding this BAA may be directed to our Privacy Officer at{" "}
                <a href="mailto:privacy@solosuds.com" className="text-indigo-600 hover:underline">
                  privacy@solosuds.com
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
