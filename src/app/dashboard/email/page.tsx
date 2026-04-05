import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmailList from "@/components/email/email-list";

export default async function EmailPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/dashboard");

  const emails = await db.email.findMany({
    where: { organizationId: session.user.organizationId },
    select: {
      id: true,
      toEmail: true,
      subject: true,
      createdAt: true,
      client: { select: { id: true, firstName: true, lastName: true } },
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email</h1>
          <p className="mt-1 text-sm text-gray-500">Send and view emails to your clients</p>
        </div>
        <Link href="/dashboard/email/compose">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Compose
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <EmailList emails={JSON.parse(JSON.stringify(emails))} />
      </div>
    </div>
  );
}
