import Link from "next/link";
import { Mail } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white pt-8 pb-6 px-6">
      <div>
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <img src="/icon.svg" alt="SoapSuds" style={{ height: "28px", width: "auto" }} />
              <span className="text-base font-semibold text-gray-800">SoapSuds</span>
            </div>
            <p className="max-w-xs text-xs text-gray-500 leading-relaxed">
              HIPAA-compliant practice management for modern healthcare providers.
            </p>
          </div>

          {/* Support */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Support</p>
            <a
              href="mailto:support@soapsuds.app"
              className="flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-indigo-600"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              support@soapsuds.app
            </a>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Legal</p>
            <Link
              href="/terms"
              className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
            >
              Terms of Service
            </Link>
            <Link
              href="/hipaa"
              className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
            >
              HIPAA Privacy Notice
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-5 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} SoapSuds. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
