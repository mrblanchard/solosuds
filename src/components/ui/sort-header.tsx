"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface SortHeaderProps {
  field: string;
  label: string;
  className?: string;
}

export default function SortHeader({ field, label, className = "" }: SortHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "";

  const isAsc = current === `${field}_asc`;
  const isDesc = current === `${field}_desc`;
  const isActive = isAsc || isDesc;

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString());
    if (!isActive || isDesc) {
      // Not sorted or was desc → go asc
      params.set("sort", `${field}_asc`);
    } else {
      // Was asc → go desc
      params.set("sort", `${field}_desc`);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <th
      scope="col"
      className={`px-2 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide ${className}`}
    >
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 rounded hover:text-gray-900 transition-colors ${
          isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        {label}
        {isAsc ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : isDesc ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
        )}
      </button>
    </th>
  );
}
