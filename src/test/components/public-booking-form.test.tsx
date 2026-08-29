// @vitest-environment happy-dom
import { render, screen, fireEvent } from "@testing-library/react";
import PublicBookingForm from "@/components/booking/public-booking-form";

const services = [
  {
    id: "s1",
    name: "Initial Consultation",
    durationMinutes: 60,
    price: 12000,
    description: "First visit",
  },
  {
    id: "s2",
    name: "Follow-up",
    durationMinutes: 30,
    price: null,
    description: null,
  },
];

function renderForm(props = {}) {
  return render(
    <PublicBookingForm orgId="org1" orgName="Test Org" services={services} {...props} />
  );
}

describe("PublicBookingForm", () => {
  describe("step 1 - service selection", () => {
    it("renders service options", () => {
      renderForm();
      expect(screen.getByText("Initial Consultation")).toBeInTheDocument();
      expect(screen.getByText("Follow-up")).toBeInTheDocument();
    });

    it("shows service price when available", () => {
      renderForm();
      expect(screen.getByText("$120.00")).toBeInTheDocument();
    });

    it("shows service description when available", () => {
      renderForm();
      expect(screen.getByText("First visit")).toBeInTheDocument();
    });

    it("shows empty state when no services", () => {
      render(<PublicBookingForm orgId="org1" orgName="Test Org" services={[]} />);
      expect(screen.getByText("No services available for online booking.")).toBeInTheDocument();
    });
  });

  describe("step 2 - details", () => {
    function goToStep2() {
      renderForm();
      fireEvent.click(screen.getByText("Initial Consultation"));
    }

    it("shows step 2 fields after selecting a service", () => {
      goToStep2();
      expect(screen.getByText("Your Details")).toBeInTheDocument();
    });

    it("step 2 is wrapped in a form element", () => {
      goToStep2();
      const form = document.querySelector("form");
      expect(form).not.toBeNull();
    });

    it("renders all required field labels in step 2", () => {
      goToStep2();
      expect(screen.getByText(/First name/i)).toBeInTheDocument();
      expect(screen.getByText(/Last name/i)).toBeInTheDocument();
      expect(screen.getByText(/Email/i)).toBeInTheDocument();
      expect(screen.getByText(/Phone/i)).toBeInTheDocument();
      expect(screen.getByText(/Notes for the practitioner/i)).toBeInTheDocument();
    });

    it("step 2 labels are linked to inputs via htmlFor/id", () => {
      goToStep2();
      const firstNameInput = screen.getByLabelText(/First name/i);
      expect(firstNameInput.tagName).toBe("INPUT");
      const emailInput = screen.getByLabelText(/Email/i);
      expect(emailInput.tagName).toBe("INPUT");
    });

    it("'change service' link returns to step 1", () => {
      goToStep2();
      fireEvent.click(screen.getByText("← Change service"));
      expect(screen.getByText("Choose a Service")).toBeInTheDocument();
    });

    it("shows validation error when required fields are missing", async () => {
      goToStep2();
      const form = document.querySelector("form")!;
      fireEvent.submit(form);
      expect(await screen.findByText(/Please fill in all required fields/i)).toBeInTheDocument();
    });
  });
});
