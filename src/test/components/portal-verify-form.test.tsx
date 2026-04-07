// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach } from "vitest";
import PortalVerifyForm from "@/components/portal/portal-verify-form";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function renderForm(props: { orgSlug?: string; contact?: string } = {}) {
  return render(
    <PortalVerifyForm
      orgSlug={props.orgSlug ?? "test-clinic"}
      contact={props.contact ?? "jane@example.com"}
    />
  );
}

describe("PortalVerifyForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
    global.fetch = vi.fn();
  });

  it("renders the code input and submit button", () => {
    renderForm();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
  });

  it("shows the contact address in the description", () => {
    renderForm({ contact: "jane@example.com" });
    expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
  });

  it("submit button is disabled when code is empty", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /verify/i })).toBeDisabled();
  });

  it("submit button is disabled when code is less than 6 digits", () => {
    renderForm();
    const input = screen.getByLabelText(/verification code/i);
    fireEvent.change(input, { target: { value: "12345" } });
    expect(screen.getByRole("button", { name: /verify/i })).toBeDisabled();
  });

  it("submit button is enabled when code is exactly 6 digits", () => {
    renderForm();
    const input = screen.getByLabelText(/verification code/i);
    fireEvent.change(input, { target: { value: "123456" } });
    expect(screen.getByRole("button", { name: /verify/i })).not.toBeDisabled();
  });

  it("strips non-numeric characters from input", () => {
    renderForm();
    const input = screen.getByLabelText(/verification code/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1a2b3c" } });
    expect(input.value).toBe("123");
  });

  it("submit button is disabled when code is more than 6 digits", () => {
    renderForm();
    const input = screen.getByLabelText(/verification code/i);
    // The component uses code.length !== 6 — only exactly 6 digits enables submit
    fireEvent.change(input, { target: { value: "1234567890" } });
    expect(screen.getByRole("button", { name: /verify/i })).toBeDisabled();
  });

  it("shows error message on incorrect or expired code", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    renderForm();
    const input = screen.getByLabelText(/verification code/i);
    fireEvent.change(input, { target: { value: "999999" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    await waitFor(() => {
      expect(screen.getByText(/incorrect or has expired/i)).toBeInTheDocument();
    });
  });

  it("navigates to files page on successful verification", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    renderForm();
    const input = screen.getByLabelText(/verification code/i);
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/portal/test-clinic/files");
    });
  });

  it("includes a link to go back and use a different contact", () => {
    renderForm();
    const link = screen.getByRole("link", { name: /different email or phone/i });
    expect(link).toHaveAttribute("href", "/portal/test-clinic");
  });

  it("sends the orgSlug, contact, and code to the verify API", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    renderForm({ orgSlug: "my-clinic", contact: "555-1234" });
    const input = screen.getByLabelText(/verification code/i);
    fireEvent.change(input, { target: { value: "456789" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/portal/verify",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ orgSlug: "my-clinic", contact: "555-1234", code: "456789" }),
        })
      );
    });
  });
});
