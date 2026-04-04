// @vitest-environment happy-dom
import { render, screen, fireEvent } from "@testing-library/react";
import { Topbar } from "@/components/layout/topbar";

// Mock sub-components to isolate topbar behavior
vi.mock("@/components/layout/search-modal", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="search-modal" /> : null,
}));

vi.mock("@/components/layout/notifications-panel", () => ({
  default: () => <button aria-label="Notifications" />,
}));

vi.mock("@/components/layout/account-menu", () => ({
  default: () => <button aria-label="Account menu" />,
}));

describe("Topbar", () => {
  describe("hamburger menu button", () => {
    it("renders the hamburger button", () => {
      render(<Topbar />);
      expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
    });

    it("hamburger button has lg:hidden class (mobile-only)", () => {
      render(<Topbar />);
      const btn = screen.getByLabelText("Open menu");
      expect(btn.className).toContain("lg:hidden");
    });

    it("hamburger button meets 44px touch target requirement", () => {
      render(<Topbar />);
      const btn = screen.getByLabelText("Open menu");
      expect(btn.className).toContain("min-h-[44px]");
      expect(btn.className).toContain("min-w-[44px]");
    });

    it("calls onMenuClick when hamburger is clicked", () => {
      const onMenuClick = vi.fn();
      render(<Topbar onMenuClick={onMenuClick} />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(onMenuClick).toHaveBeenCalledTimes(1);
    });

    it("does not throw when onMenuClick is not provided", () => {
      render(<Topbar />);
      expect(() => fireEvent.click(screen.getByLabelText("Open menu"))).not.toThrow();
    });
  });

  describe("search button", () => {
    it("renders the search trigger button", () => {
      render(<Topbar />);
      // Search button contains a Search icon and text
      expect(screen.getByText("Search…")).toBeInTheDocument();
    });

    it("opens search modal when search button is clicked", () => {
      render(<Topbar />);
      fireEvent.click(screen.getByText("Search…").closest("button")!);
      expect(screen.getByTestId("search-modal")).toBeInTheDocument();
    });

    it("opens search modal on Ctrl+K", () => {
      render(<Topbar />);
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(screen.getByTestId("search-modal")).toBeInTheDocument();
    });

    it("opens search modal on Meta+K", () => {
      render(<Topbar />);
      fireEvent.keyDown(window, { key: "k", metaKey: true });
      expect(screen.getByTestId("search-modal")).toBeInTheDocument();
    });
  });

  describe("notifications and account", () => {
    it("renders notifications bell button", () => {
      render(<Topbar />);
      expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    });

    it("renders account menu button", () => {
      render(<Topbar />);
      expect(screen.getByLabelText("Account menu")).toBeInTheDocument();
    });
  });
});
