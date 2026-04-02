import { ClientForm } from "@/components/clients/client-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/clients"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Clients
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Add Client</h1>
      </div>
      <ClientForm />
    </div>
  );
}
