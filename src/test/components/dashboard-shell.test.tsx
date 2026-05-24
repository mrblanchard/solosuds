// @vitest-environment happy-dom
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// Mock Sidebar and Topbar so we can observe the props they receive
vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: ({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) => (
    <div
      data-testid="sidebar"
      data-open={String(mobileOpen)}
    >
      <button data-testid="sidebar-close" onClick={onMobileClose}>
        close
      </button>
    </div>
  ),
}));

vi.mock("@/components/layout/topbar", () => ({
  Topbar: ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <button data-testid="hamburger" onClick={onMenuClick}>
      menu
    </button>
  ),
}));

describe("DashboardShell", () => {
  describe("initial state", () => {
    it("renders children", () => {
      render(<DashboardShell><p>Page content</p></DashboardShell>);
      expect(screen.getByText("Page content")).toBeInTheDocument();
    });

    it("sidebar starts closed", () => {
      render(<DashboardShell><span /></DashboardShell>);
      expect(screen.getByTestId("sidebar").dataset.open).toBe("false");
    });

    it("renders sidebar and topbar", () => {
      render(<DashboardShell><span /></DashboardShell>);
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("hamburger")).toBeInTheDocument();
    });
  });

  describe("sidebar toggle", () => {
    it("opens sidebar when hamburger is clicked", () => {
      render(<DashboardShell><span /></DashboardShell>);
      fireEvent.click(screen.getByTestId("hamburger"));
      expect(screen.getByTestId("sidebar").dataset.open).toBe("true");
    });

    it("closes sidebar when sidebar's onClose is triggered", () => {
      render(<DashboardShell><span /></DashboardShell>);
      // First open
      fireEvent.click(screen.getByTestId("hamburger"));
      expect(screen.getByTestId("sidebar").dataset.open).toBe("true");
      // Then close via sidebar's close mechanism
      fireEvent.click(screen.getByTestId("sidebar-close"));
      expect(screen.getByTestId("sidebar").dataset.open).toBe("false");
    });

    it("can toggle open-close-open", () => {
      render(<DashboardShell><span /></DashboardShell>);
      fireEvent.click(screen.getByTestId("hamburger"));
      expect(screen.getByTestId("sidebar").dataset.open).toBe("true");
      fireEvent.click(screen.getByTestId("sidebar-close"));
      expect(screen.getByTestId("sidebar").dataset.open).toBe("false");
      fireEvent.click(screen.getByTestId("hamburger"));
      expect(screen.getByTestId("sidebar").dataset.open).toBe("true");
    });
  });

  describe("layout structure", () => {
    it("renders main element wrapping children", () => {
      render(<DashboardShell><p>child</p></DashboardShell>);
      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();
      expect(main).toContainElement(screen.getByText("child"));
    });

    it("main has responsive padding classes", () => {
      render(<DashboardShell><span /></DashboardShell>);
      const main = screen.getByRole("main");
      expect(main.className).toContain("p-4");
      expect(main.className).toContain("sm:p-6");
    });
  });
});
