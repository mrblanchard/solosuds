// @vitest-environment happy-dom
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("next/link", () => ({
  default: ({ href, children, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

describe("Sidebar", () => {
  // Helper: get the mobile aside (has lg:hidden class)
  function getMobileAside() {
    return screen.getAllByRole("complementary").find(el =>
      el.className.includes("lg:hidden")
    )!;
  }

  // Helper: get the desktop aside (has lg:flex class)
  function getDesktopAside() {
    return screen.getAllByRole("complementary").find(el =>
      el.className.includes("lg:flex")
    )!;
  }

  describe("rendering", () => {
    it("renders the logo", () => {
      render(<Sidebar />);
      expect(screen.getAllByAltText("SoloSuds").length).toBeGreaterThanOrEqual(1);
    });

    it("renders all navigation items", () => {
      render(<Sidebar />);
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Schedule").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Clients").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("SOAP Notes").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Intake Forms").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Messages").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Billing").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
    });

    it("renders sign out buttons", () => {
      render(<Sidebar />);
      expect(screen.getAllByText("Sign out").length).toBeGreaterThanOrEqual(1);
    });

    it("renders close button inside mobile sidebar", () => {
      render(<Sidebar mobileOpen={true} />);
      const mobile = getMobileAside();
      expect(mobile.querySelector("[aria-label='Close menu']")).toBeInTheDocument();
    });
  });

  describe("mobile open/close state", () => {
    it("applies -translate-x-full when closed (default)", () => {
      render(<Sidebar />);
      expect(getMobileAside().className).toContain("-translate-x-full");
    });

    it("applies -translate-x-full when mobileOpen=false explicitly", () => {
      render(<Sidebar mobileOpen={false} />);
      expect(getMobileAside().className).toContain("-translate-x-full");
    });

    it("applies translate-x-0 when mobileOpen=true", () => {
      render(<Sidebar mobileOpen={true} />);
      expect(getMobileAside().className).toContain("translate-x-0");
    });
  });

  describe("backdrop overlay", () => {
    it("renders backdrop when mobileOpen=true", () => {
      const { container } = render(<Sidebar mobileOpen={true} />);
      const backdrop = container.querySelector("div[aria-hidden='true']");
      expect(backdrop).toBeInTheDocument();
    });

    it("does NOT render backdrop when mobileOpen=false", () => {
      const { container } = render(<Sidebar mobileOpen={false} />);
      const backdrop = container.querySelector("div[aria-hidden='true']");
      expect(backdrop).not.toBeInTheDocument();
    });

    it("calls onMobileClose when backdrop is clicked", () => {
      const onMobileClose = vi.fn();
      const { container } = render(<Sidebar mobileOpen={true} onMobileClose={onMobileClose} />);
      const backdrop = container.querySelector("div[aria-hidden='true']")!;
      fireEvent.click(backdrop);
      expect(onMobileClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("close button", () => {
    it("calls onMobileClose when close button is clicked", () => {
      const onMobileClose = vi.fn();
      render(<Sidebar mobileOpen={true} onMobileClose={onMobileClose} />);
      const mobile = getMobileAside();
      const closeBtn = mobile.querySelector("[aria-label='Close menu']") as HTMLElement;
      fireEvent.click(closeBtn);
      expect(onMobileClose).toHaveBeenCalledTimes(1);
    });

    it("close button only exists in mobile aside, not desktop", () => {
      render(<Sidebar mobileOpen={true} />);
      expect(getMobileAside().querySelector("[aria-label='Close menu']")).toBeInTheDocument();
      expect(getDesktopAside().querySelector("[aria-label='Close menu']")).toBeNull();
    });
  });

  describe("desktop collapsed state", () => {
    it("desktop aside has w-64 by default", () => {
      render(<Sidebar />);
      expect(getDesktopAside().className).toContain("w-64");
    });

    it("desktop aside has w-16 when collapsed", () => {
      render(<Sidebar collapsed={true} />);
      expect(getDesktopAside().className).toContain("w-16");
    });

    it("hides labels and shows only icons when collapsed", () => {
      render(<Sidebar collapsed={true} />);
      const desktop = getDesktopAside();
      const links = desktop.querySelectorAll("a");
      for (const link of links) {
        expect(link.querySelector("span")).toBeNull();
      }
    });

    it("calls onToggleCollapse when collapse button is clicked", () => {
      const onToggle = vi.fn();
      render(<Sidebar onToggleCollapse={onToggle} />);
      const desktop = getDesktopAside();
      const collapseBtn = desktop.querySelector("[title='Collapse sidebar']") as HTMLElement;
      fireEvent.click(collapseBtn);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("active state", () => {
    it("marks Dashboard link as active when on /dashboard", () => {
      render(<Sidebar mobileOpen={true} />);
      const dashboardLinks = screen.getAllByRole("link", { name: /dashboard/i });
      expect(dashboardLinks[0].className).toContain("bg-indigo-50");
    });
  });
});
