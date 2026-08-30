"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, User, Mail, Phone, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClientContactCardProps {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null; // pre-formatted string from server
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  tags?: { id: string; name: string }[];
  internalNotes?: string | null;
}

export function ClientContactCard({
  firstName,
  lastName,
  email,
  phone,
  dateOfBirth,
  address,
  city,
  state,
  zip,
  emergencyName,
  emergencyPhone,
  tags = [],
  internalNotes,
}: ClientContactCardProps) {
  const [open, setOpen] = useState(false);

  const addressLine = [address, city, state, zip].filter(Boolean).join(", ");

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-gray-900">Contact Information</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <CardContent className="space-y-3 text-sm pt-0 pb-5">
          <InfoRow icon={User} label="Full Name" value={`${firstName} ${lastName}`} />
          {email && <InfoRow icon={Mail} label="Email" value={email} />}
          {phone && <InfoRow icon={Phone} label="Phone" value={phone} />}
          {dateOfBirth && <InfoRow icon={User} label="Date of Birth" value={dateOfBirth} />}
          {addressLine && <InfoRow icon={MapPin} label="Address" value={addressLine} />}
          {emergencyName && (
            <InfoRow
              icon={Phone}
              label="Emergency Contact"
              value={emergencyPhone ? `${emergencyName}, ${emergencyPhone}` : emergencyName}
            />
          )}

          {tags.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {internalNotes && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Internal Notes</p>
              <p className="whitespace-pre-wrap text-gray-600">{internalNotes}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="break-words text-gray-900">{value}</p>
      </div>
    </div>
  );
}
