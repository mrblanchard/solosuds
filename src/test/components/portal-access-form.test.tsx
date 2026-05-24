// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach } from "vitest";
import PortalAccessForm from "@/components/portal/portal-access-form";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock Turnstile — renders a button to simulate CAPTCHA completion
vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" data-testid="captcha-mock" onClick={() => onSuccess("test-cf-token")}>
      Complete CAPTCHA
    </button>
  ),
}));

function renderForm() {
  return render(<PortalAccessForm orgSlug="test-clinic" orgName="Test Clinic" />);
}

describe("PortalAccessForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
    global.fetch = vi.fn();
  });

  it("renders the contact input and submit button", () => {
    renderForm();
    expect(screen.getByLabelText(/email address or phone number/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send verification code/i })).toBeInTheDocument();
  });

  it("submit button is disabled when contact field is empty", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /send verification code/i })).toBeDisabled();
  });

  it("enables submit button when valid contact is entered", () => {
    renderForm();
    const input = screen.getByLabelText(/email address or phone number/i);
    fireEvent.change(input, { target: { value: "jane@example.com" } });
    expect(screen.getByRole("button", { name: /send verification code/i })).not.toBeDisabled();
  });

  describe("contact field validation", () => {
    it("shows email validation error for input containing @ but invalid format", async () => {
      renderForm();
      const input = screen.getByLabelText(/email address or phone number/i);
      fireEvent.change(input, { target: { value: "not-an-email@" } });
      fireEvent.blur(input);
      await waitFor(() => {
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
      });
    });

    it("shows phone validation error for short number", async () => {
      renderForm();
      const input = screen.getByLabelText(/email address or phone number/i);
      fireEvent.change(input, { target: { value: "123" } });
      fireEvent.blur(input);
      await waitFor(() => {
        expect(screen.getByText(/valid phone number/i)).toBeInTheDocument();
      });
    });

    it("clears validation error when input changes after blur", async () => {
      renderForm();
      const input = screen.getByLabelText(/email address or phone number/i);
      fireEvent.change(input, { target: { value: "bad@" } });
      fireEvent.blur(input);
      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
      fireEvent.change(input, { target: { value: "good@example.com" } });
      expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
    });

    it("accepts a valid email", () => {
      renderForm();
      const input = screen.getByLabelText(/email address or phone number/i);
      fireEvent.change(input, { target: { value: "jane@example.com" } });
      fireEvent.blur(input);
      expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/valid phone/i)).not.toBeInTheDocument();
    });

    it("accepts a valid phone number", () => {
      renderForm();
      const input = screen.getByLabelText(/email address or phone number/i);
      fireEvent.change(input, { target: { value: "555-555-5555" } });
      fireEvent.blur(input);
      expect(screen.queryByText(/valid phone/i)).not.toBeInTheDocument();
    });
  });

  it("shows API error message on failed request", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "CAPTCHA verification failed. Please try again." }),
    });
    renderForm();
    const input = screen.getByLabelText(/email address or phone number/i);
    fireEvent.change(input, { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    await waitFor(() => {
      expect(screen.getByText(/CAPTCHA verification failed/i)).toBeInTheDocument();
    });
  });

  it("navigates to verify page on successful submission", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    renderForm();
    const input = screen.getByLabelText(/email address or phone number/i);
    fireEvent.change(input, { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/portal/test-clinic/verify")
      );
    });
  });

  it("includes the contact in the verify URL", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    renderForm();
    const input = screen.getByLabelText(/email address or phone number/i);
    fireEvent.change(input, { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("jane@example.com"))
      );
    });
  });
});
