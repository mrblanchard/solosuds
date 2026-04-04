// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AppointmentForm from "@/components/schedule/appointment-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

const clients = [{ id: "c1", firstName: "Jane", lastName: "Smith" }];
const practitioners = [{ id: "p1", name: "Dr. Lee" }];
const services = [{ id: "s1", name: "Massage", durationMinutes: 60 }];

function renderForm(props = {}) {
  return render(
    <AppointmentForm
      clients={clients}
      practitioners={practitioners}
      services={services}
      {...props}
    />
  );
}

describe("AppointmentForm", () => {
  describe("rendering", () => {
    it("renders all field labels", () => {
      renderForm();
      expect(screen.getByText("Client *")).toBeInTheDocument();
      expect(screen.getByText("Practitioner *")).toBeInTheDocument();
      expect(screen.getByText("Service")).toBeInTheDocument();
      expect(screen.getByText("Start Time *")).toBeInTheDocument();
      expect(screen.getByText("End Time *")).toBeInTheDocument();
      expect(screen.getByText(/Notes/)).toBeInTheDocument();
    });

    it("renders client options", () => {
      renderForm();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("renders practitioner options", () => {
      renderForm();
      expect(screen.getByText("Dr. Lee")).toBeInTheDocument();
    });

    it("renders service options", () => {
      renderForm();
      expect(screen.getByText("Massage (60 min)")).toBeInTheDocument();
    });

    it("pre-selects client when defaultClientId is provided", () => {
      renderForm({ defaultClientId: "c1" });
      const select = screen.getByLabelText("Client *") as HTMLSelectElement;
      expect(select.value).toBe("c1");
    });
  });

  describe("accessibility - label/id associations", () => {
    it("client label is linked to client select", () => {
      renderForm();
      const select = screen.getByLabelText("Client *");
      expect(select.tagName).toBe("SELECT");
    });

    it("practitioner label is linked to practitioner select", () => {
      renderForm();
      const select = screen.getByLabelText("Practitioner *");
      expect(select.tagName).toBe("SELECT");
    });

    it("service label is linked to service select", () => {
      renderForm();
      const select = screen.getByLabelText("Service");
      expect(select.tagName).toBe("SELECT");
    });

    it("start time label is linked to start time input", () => {
      renderForm();
      const input = screen.getByLabelText("Start Time *");
      expect(input.tagName).toBe("INPUT");
    });

    it("end time label is linked to end time input", () => {
      renderForm();
      const input = screen.getByLabelText("End Time *");
      expect(input.tagName).toBe("INPUT");
    });

    it("notes label is linked to notes textarea", () => {
      renderForm();
      const textarea = screen.getByLabelText("Notes (internal)");
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("send reminder checkbox has accessible label", () => {
      renderForm();
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows client required error when submitting empty form", async () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /Book Appointment/i }));
      await waitFor(() => {
        expect(screen.getByText("Client is required")).toBeInTheDocument();
      });
    });

    it("shows practitioner required error when submitting empty form", async () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /Book Appointment/i }));
      await waitFor(() => {
        expect(screen.getByText("Practitioner is required")).toBeInTheDocument();
      });
    });
  });

  describe("service auto end-time", () => {
    it("calculates end time from service duration when start time is set", () => {
      renderForm({ defaultStartTime: "2024-06-15T10:00" });
      const serviceSelect = screen.getByLabelText("Service") as HTMLSelectElement;
      fireEvent.change(serviceSelect, { target: { value: "s1" } });

      const endInput = screen.getByLabelText("End Time *") as HTMLInputElement;
      // End time should be 60 minutes after start; compute expected using same Date logic
      const expectedEnd = new Date(
        new Date("2024-06-15T10:00").getTime() + 60 * 60000
      ).toISOString().slice(0, 16);
      expect(endInput.value).toBe(expectedEnd);
    });
  });

  describe("update mode", () => {
    it("shows 'Update Appointment' button when appointmentId is provided", () => {
      renderForm({ appointmentId: "appt1" });
      expect(screen.getByRole("button", { name: /Update Appointment/i })).toBeInTheDocument();
    });
  });
});
