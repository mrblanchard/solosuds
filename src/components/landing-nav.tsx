"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
        <a href="#features" className="hover:text-gray-900">Features</a>
        <a href="#pricing" className="hover:text-gray-900">Pricing</a>
        <a href="#security" className="hover:text-gray-900">Security</a>
      </div>

      {/* Desktop CTA buttons */}
      <div className="hidden md:flex items-center gap-3">
        <Link href="/login">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
        <Link href="/register">
          <Button size="sm">Start Free Trial</Button>
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div
          data-testid="mobile-nav"
          className="md:hidden absolute top-16 left-0 right-0 border-b border-gray-100 bg-white/95 backdrop-blur-md shadow-lg z-40 px-4 py-4 space-y-3"
        >          <a
            href="#features"
            onClick={() => setOpen(false)}
            className="block py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Features
          </a>
          <a
            href="#pricing"
            onClick={() => setOpen(false)}
            className="block py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Pricing
          </a>
          <a
            href="#security"
            onClick={() => setOpen(false)}
            className="block py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Security
          </a>
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full">Sign in</Button>
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <Button className="w-full">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
