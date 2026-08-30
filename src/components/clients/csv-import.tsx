"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const SCHEMA_FIELDS = [
  { value: "", label: "(Skip)" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "dateOfBirth", label: "Date of Birth" },
  { value: "gender", label: "Gender" },
  { value: "pronouns", label: "Pronouns" },
  { value: "address", label: "Address" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "zip", label: "Zip Code" },
  { value: "country", label: "Country" },
  { value: "emergencyName", label: "Emergency Contact Name" },
  { value: "emergencyPhone", label: "Emergency Phone" },
  { value: "referralSource", label: "Referral Source" },
  { value: "internalNotes", label: "Internal Notes" },
];

const HEADER_MAP: Record<string, string> = {
  "first name": "firstName",
  first_name: "firstName",
  firstname: "firstName",
  "last name": "lastName",
  last_name: "lastName",
  lastname: "lastName",
  email: "email",
  "email address": "email",
  phone: "phone",
  "phone number": "phone",
  phone_number: "phone",
  "date of birth": "dateOfBirth",
  date_of_birth: "dateOfBirth",
  dob: "dateOfBirth",
  birthday: "dateOfBirth",
  gender: "gender",
  pronouns: "pronouns",
  address: "address",
  "street address": "address",
  street: "address",
  city: "city",
  state: "state",
  province: "state",
  zip: "zip",
  "zip code": "zip",
  zipcode: "zip",
  postal: "zip",
  "postal code": "zip",
  country: "country",
  "emergency contact": "emergencyName",
  "emergency name": "emergencyName",
  emergency_name: "emergencyName",
  "emergency phone": "emergencyPhone",
  emergency_phone: "emergencyPhone",
  referral: "referralSource",
  "referral source": "referralSource",
  referral_source: "referralSource",
  notes: "internalNotes",
  "internal notes": "internalNotes",
  internal_notes: "internalNotes",
};

type Step = "upload" | "map" | "importing" | "done";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export default function CsvImport() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((f: File) => {
    setError("");
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setError("File must have a header row and at least one data row");
        return;
      }

      const hdrs = parseLine(lines[0]).map((h) => h.trim());
      setHeaders(hdrs);

      // Auto-map headers
      const autoMap: Record<string, string> = {};
      for (const h of hdrs) {
        const normalized = h.toLowerCase().trim();
        if (HEADER_MAP[normalized]) {
          autoMap[h] = HEADER_MAP[normalized];
        }
      }
      setMapping(autoMap);

      // Preview first 3 data rows
      const previewRows = lines.slice(1, 4).map((l) => parseLine(l).map((v) => v.trim()));
      setPreview(previewRows);

      setFile(f);
      setStep("map");
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const handleImport = async () => {
    if (!file) return;

    // Validate required fields mapped
    const mappedFields = Object.values(mapping);
    if (!mappedFields.includes("firstName") || !mappedFields.includes("lastName")) {
      setError("First Name and Last Name must be mapped");
      return;
    }

    setStep("importing");
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));

    try {
      const res = await fetch("/api/clients/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
        setStep("map");
        return;
      }
      setResult(data);
      setStep("done");
    } catch {
      setError("Network error");
      setStep("map");
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setPreview([]);
    setMapping({});
    setResult(null);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/clients"
          aria-label="Back to clients"
          className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Clients</h1>
          <p className="text-sm text-gray-500">Upload a CSV file to bulk import clients</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center hover:border-indigo-300 transition-colors cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drag and drop your CSV file here
                </p>
                <p className="text-xs text-gray-500 mt-1">or click to browse (max 5MB, 500 rows)</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processFile(f);
                }}
              />
            </div>

            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Expected format</p>
              <p className="text-xs text-gray-500 mb-2">
                Your CSV should have a header row. Common column names will be auto-detected:
              </p>
              <code className="block text-xs text-gray-600 bg-white rounded p-2 border">
                First Name,Last Name,Email,Phone,Date of Birth,Address,City,State,Zip
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Map Columns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-gray-500">
              Match your CSV columns to client fields. <strong>First Name</strong> and{" "}
              <strong>Last Name</strong> are required.
            </p>

            <div className="space-y-3">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <div className="w-1/3">
                    <Label className="text-sm font-medium text-gray-700">{header}</Label>
                    {preview[0] && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        e.g. &quot;{preview[0][headers.indexOf(header)] ?? ""}&quot;
                      </p>
                    )}
                  </div>
                  <span className="text-gray-300">→</span>
                  <select
                    value={mapping[header] || ""}
                    onChange={(e) =>
                      setMapping((prev) => {
                        const next = { ...prev };
                        if (e.target.value) {
                          next[header] = e.target.value;
                        } else {
                          delete next[header];
                        }
                        return next;
                      })
                    }
                    className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  >
                    {SCHEMA_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {preview.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Preview ({preview.length} row{preview.length > 1 ? "s" : ""})
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-gray-700 max-w-[150px] truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-1" /> Import Clients
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-sm text-gray-600">Importing clients...</p>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <h2 className="text-lg font-semibold text-gray-900">Import Complete</h2>
            </div>

            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                <p className="text-xs text-gray-500">Imported</p>
              </div>
              {result.skipped > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-500">{result.skipped}</p>
                  <p className="text-xs text-gray-500">Skipped</p>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">Errors</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-700">
                      <Badge variant="outline" className="mr-1">
                        Row {err.row}
                      </Badge>
                      {err.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={reset}>
                Import More
              </Button>
              <Link href="/dashboard/clients">
                <Button>View Clients</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
