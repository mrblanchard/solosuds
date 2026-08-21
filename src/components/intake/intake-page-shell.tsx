import PublicIntakeForm from "@/components/intake/public-intake-form";
import { AppFooter } from "@/components/layout/app-footer";

interface Props {
  form: {
    id: string;
    title: string;
    description: string | null;
    fields: unknown;
    isEmailConsent: boolean;
  };
  orgName: string;
  clientId?: string;
}

/** Shared layout for the public intake-form page, used by both /intake/[id] and /intake/[orgSlug]/[formId]. */
export function IntakePageShell({ form, orgName, clientId }: Props) {
  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-sm text-gray-500">{orgName}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{form.title}</h1>
          {form.description && (
            <p className="mt-2 text-sm text-gray-600">{form.description}</p>
          )}
        </div>
        <PublicIntakeForm
          formId={form.id}
          fields={form.fields as any[]}
          clientId={clientId}
          isEmailConsent={form.isEmailConsent}
          practiceName={orgName}
        />
      </div>
      <AppFooter />
    </div>
  );
}
