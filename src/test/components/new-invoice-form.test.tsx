// @vitest-environment happy-dom
import { render, screen, fireEvent } from "@testing-library/react";
import NewInvoiceForm from "@/components/billing/new-invoice-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

const clients = [
  { id: "c1", firstName: "Jane", lastName: "Smith" },
  { id: "c2", firstName: "Bob", lastName: "Jones" },
];

function renderForm(props = {}) {
  return render(<NewInvoiceForm clients={clients} {...props} />);
}

describe("NewInvoiceForm", () => {
  describe("rendering", () => {
    it("renders client selector", () => {
      renderForm();
      expect(screen.getByLabelText("Client *")).toBeInTheDocument();
    });

    it("renders all clients in the selector", () => {
      renderForm();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });

    it("renders table column headers", () => {
      renderForm();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("CPT")).toBeInTheDocument();
      expect(screen.getByText("Qty")).toBeInTheDocument();
      expect(screen.getByText("Unit Price")).toBeInTheDocument();
    });

    it("renders due date and notes fields", () => {
      renderForm();
      expect(screen.getByLabelText("Due Date (optional)")).toBeInTheDocument();
      expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
    });

    it("renders tax field with accessible label", () => {
      renderForm();
      expect(screen.getByLabelText("Tax ($)")).toBeInTheDocument();
    });

    it("renders Create Invoice button", () => {
      renderForm();
      expect(screen.getByRole("button", { name: /Create Invoice/i })).toBeInTheDocument();
    });
  });

  describe("accessibility - aria-labels on line item inputs", () => {
    it("description input has row-scoped aria-label", () => {
      renderForm();
      expect(screen.getByLabelText("Row 1 description")).toBeInTheDocument();
    });

    it("CPT code input has row-scoped aria-label", () => {
      renderForm();
      expect(screen.getByLabelText("Row 1 CPT code")).toBeInTheDocument();
    });

    it("quantity input has row-scoped aria-label", () => {
      renderForm();
      expect(screen.getByLabelText("Row 1 quantity")).toBeInTheDocument();
    });

    it("unit price input has row-scoped aria-label", () => {
      renderForm();
      expect(screen.getByLabelText("Row 1 unit price")).toBeInTheDocument();
    });
  });

  describe("line item management", () => {
    it("starts with one line item row", () => {
      renderForm();
      expect(screen.getAllByLabelText(/description/i)).toHaveLength(1);
    });

    it("adds a new line item when '+ Add Item' is clicked", () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /Add Item/i }));
      expect(screen.getAllByLabelText(/description/i)).toHaveLength(2);
    });

    it("new row gets scoped aria-labels", () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /Add Item/i }));
      expect(screen.getByLabelText("Row 2 description")).toBeInTheDocument();
      expect(screen.getByLabelText("Row 2 unit price")).toBeInTheDocument();
    });

    it("shows remove button when more than one line item exists", () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /Add Item/i }));
      expect(screen.getByRole("button", { name: "Remove item 1" })).toBeInTheDocument();
    });

    it("remove button has accessible label", () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /Add Item/i }));
      const removeButtons = screen.getAllByRole("button", { name: /Remove item/i });
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it("removes a line item when remove button is clicked", () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /Add Item/i }));
      expect(screen.getAllByLabelText(/description/i)).toHaveLength(2);
      fireEvent.click(screen.getByRole("button", { name: "Remove item 1" }));
      expect(screen.getAllByLabelText(/description/i)).toHaveLength(1);
    });
  });

  describe("totals calculation", () => {
    it("shows subtotal and total in summary", () => {
      renderForm();
      expect(screen.getByText("Subtotal")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows error when no client is selected on submit", async () => {
      renderForm();
      fireEvent.submit(document.querySelector("form")!);
      expect(await screen.findByText("Please select a client.")).toBeInTheDocument();
    });

    it("shows error when line item has no description", async () => {
      renderForm();
      // Select a client to pass that check
      const clientSelect = screen.getByLabelText("Client *");
      fireEvent.change(clientSelect, { target: { value: "c1" } });
      fireEvent.submit(document.querySelector("form")!);
      expect(
        await screen.findByText(/description and a price/i)
      ).toBeInTheDocument();
    });
  });

  describe("pre-filled client", () => {
    it("pre-selects client when defaultClientId is provided", () => {
      renderForm({ defaultClientId: "c1" });
      const select = screen.getByLabelText("Client *") as HTMLSelectElement;
      expect(select.value).toBe("c1");
    });
  });
});
