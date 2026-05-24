// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewNoteForm from "@/components/notes/new-note-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const clients = [
  { id: "c1", firstName: "Jane", lastName: "Smith" },
  { id: "c2", firstName: "Bob", lastName: "Jones" },
];
const templates = [{ id: "t1", name: "SOAP Template" }];

function renderForm(props = {}) {
  return render(
    <NewNoteForm clients={clients} templates={templates} {...props} />
  );
}

describe("NewNoteForm", () => {
  describe("rendering", () => {
    it("renders client, date, and template fields", () => {
      renderForm();
      expect(screen.getByText("Client *")).toBeInTheDocument();
      expect(screen.getByText("Session Date *")).toBeInTheDocument();
      expect(screen.getByText("Template (optional)")).toBeInTheDocument();
    });

    it("renders all client options", () => {
      renderForm();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });

    it("renders template options", () => {
      renderForm();
      expect(screen.getByText("SOAP Template")).toBeInTheDocument();
      expect(screen.getByText("No template")).toBeInTheDocument();
    });

    it("pre-selects client when defaultClientId is provided", () => {
      renderForm({ defaultClientId: "c1" });
      const select = screen.getByLabelText("Client *") as HTMLSelectElement;
      expect(select.value).toBe("c1");
    });

    it("shows duplicate info banner when duplicateFromId is set", () => {
      renderForm({ duplicateFromId: "note123" });
      expect(screen.getByText(/pre-filled from the previous/i)).toBeInTheDocument();
    });
  });

  describe("accessibility - label/id associations", () => {
    it("client label is linked to client select", () => {
      renderForm();
      const select = screen.getByLabelText("Client *");
      expect(select.tagName).toBe("SELECT");
    });

    it("template label is linked to template select", () => {
      renderForm();
      const select = screen.getByLabelText("Template (optional)");
      expect(select.tagName).toBe("SELECT");
    });
  });

  describe("validation", () => {
    it("shows required error when no client is selected on submit", async () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /Start Note/i }));
      await waitFor(() => {
        expect(screen.getByText("Please select a client")).toBeInTheDocument();
      });
    });
  });
});
