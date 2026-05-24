// @vitest-environment happy-dom
import { render, screen, fireEvent } from "@testing-library/react";
import LandingNav from "@/components/landing-nav";

vi.mock("next/link", () => ({
  default: ({ href, children, onClick }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, variant }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

describe("LandingNav", () => {
  describe("desktop nav links", () => {
    it("renders all desktop nav links", () => {
      render(<LandingNav />);
      const featuresLinks = screen.getAllByText("Features");
      const pricingLinks = screen.getAllByText("Pricing");
      const securityLinks = screen.getAllByText("Security");
      // At least one of each (desktop hidden div + mobile)
      expect(featuresLinks.length).toBeGreaterThanOrEqual(1);
      expect(pricingLinks.length).toBeGreaterThanOrEqual(1);
      expect(securityLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("desktop nav links have hidden md:flex parent", () => {
      const { container } = render(<LandingNav />);
      const desktopNav = container.querySelector(".hidden.md\\:flex");
      expect(desktopNav).toBeInTheDocument();
    });

    it("renders Sign in and Start Free Trial CTA buttons (desktop)", () => {
      render(<LandingNav />);
      const signInButtons = screen.getAllByText("Sign in");
      const trialButtons = screen.getAllByText("Start Free Trial");
      expect(signInButtons.length).toBeGreaterThanOrEqual(1);
      expect(trialButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("mobile hamburger button", () => {
    it("renders the hamburger button", () => {
      render(<LandingNav />);
      expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
    });

    it("hamburger has md:hidden class (mobile-only)", () => {
      render(<LandingNav />);
      expect(screen.getByLabelText("Open menu").className).toContain("md:hidden");
    });

    it("hamburger meets 44px touch target requirement", () => {
      render(<LandingNav />);
      const btn = screen.getByLabelText("Open menu");
      expect(btn.className).toContain("min-h-[44px]");
      expect(btn.className).toContain("min-w-[44px]");
    });
  });

  describe("mobile menu toggle", () => {
    it("mobile dropdown is hidden initially", () => {
      render(<LandingNav />);
      // The mobile dropdown div is only added to the DOM when open=true
      expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();
    });

    it("shows mobile menu when hamburger is clicked", () => {
      render(<LandingNav />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      const mobileNav = screen.getByTestId("mobile-nav");
      expect(mobileNav).toBeInTheDocument();
      expect(mobileNav).toHaveTextContent("Features");
      expect(mobileNav).toHaveTextContent("Pricing");
      expect(mobileNav).toHaveTextContent("Security");
    });

    it("shows X (close) icon when menu is open", () => {
      render(<LandingNav />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
    });

    it("hides mobile menu when X button is clicked", () => {
      render(<LandingNav />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText("Close menu"));
      expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();
    });

    it("closes menu when a nav link is clicked", () => {
      render(<LandingNav />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      const mobileNav = screen.getByTestId("mobile-nav");
      fireEvent.click(mobileNav.querySelector("a[href='#features']")!);
      expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();
    });

    it("mobile menu shows Sign in and Start Free Trial", () => {
      render(<LandingNav />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      const mobileNav = screen.getByTestId("mobile-nav");
      expect(mobileNav.querySelector("a[href='/login']")).toBeInTheDocument();
      expect(mobileNav.querySelector("a[href='/register']")).toBeInTheDocument();
    });
  });
});
