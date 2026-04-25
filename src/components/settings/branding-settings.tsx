"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Palette, Image as ImageIcon } from "lucide-react";

interface BrandingData {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  name: string;
}

interface Props {
  org: BrandingData;
}

export default function BrandingSettings({ org }: Props) {
  const [logoPreview, setLogoPreview] = useState<string | null>(org.logoUrl);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(org.faviconUrl);
  const [primaryColor, setPrimaryColor] = useState(org.primaryColor ?? "");
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);
  const [savingColor, setSavingColor] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, type: "logo" | "favicon") {
    setUploading(type);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/settings/branding/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Upload failed");
        return;
      }
      // Bust cache with timestamp so browser re-fetches the new image
      const url = `${data.url}?v=${Date.now()}`;
      if (type === "logo") setLogoPreview(url);
      else setFaviconPreview(url);
      setMessage(`${type === "logo" ? "Logo" : "Favicon"} updated! Reload to see changes in the sidebar.`);
    } finally {
      setUploading(null);
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, "logo");
  }

  function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, "favicon");
  }

  async function removeBrandingField(field: "logoUrl" | "faviconUrl") {
    setMessage(null);
    const res = await fetch("/api/settings/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: null }),
    });
    if (res.ok) {
      if (field === "logoUrl") setLogoPreview(null);
      else setFaviconPreview(null);
      setMessage("Removed.");
    }
  }

  async function saveColor() {
    if (primaryColor && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor)) {
      setMessage("Invalid color — use a hex value like #5a4f8a");
      return;
    }
    setSavingColor(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryColor: primaryColor || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Save failed");
      } else {
        setMessage("Brand color saved! Reload to see changes.");
      }
    } finally {
      setSavingColor(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-indigo-600" />
          Branding
        </CardTitle>
        <p className="text-sm text-gray-500">
          Customize how your practice looks to you and your team. Your logo, colors, and favicon
          replace the default SoloSuds branding throughout the app.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Logo */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <ImageIcon className="h-4 w-4" /> Practice Logo
          </Label>
          <p className="text-xs text-gray-500">Shown in the sidebar. PNG, JPG, SVG, or WebP. Max 2 MB.</p>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-xs text-gray-400 text-center px-2">No logo</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading === "logo"}
                onClick={() => logoInputRef.current?.click()}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                {uploading === "logo" ? "Uploading…" : "Upload Logo"}
              </Button>
              {logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeBrandingField("logoUrl")}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </div>

        {/* Favicon */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <ImageIcon className="h-4 w-4" /> Favicon
          </Label>
          <p className="text-xs text-gray-500">Browser tab icon. ICO, PNG, or SVG. Recommended 32×32. Max 2 MB.</p>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
              {faviconPreview ? (
                <img src={faviconPreview} alt="Favicon preview" className="h-8 w-8 object-contain" />
              ) : (
                <span className="text-[10px] text-gray-400 text-center">None</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading === "favicon"}
                onClick={() => faviconInputRef.current?.click()}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                {uploading === "favicon" ? "Uploading…" : "Upload Favicon"}
              </Button>
              {faviconPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeBrandingField("faviconUrl")}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/png,image/x-icon,image/svg+xml,image/gif"
              className="hidden"
              onChange={handleFaviconChange}
            />
          </div>
        </div>

        {/* Primary color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Palette className="h-4 w-4" /> Brand Color
          </Label>
          <p className="text-xs text-gray-500">
            Overrides the app's accent color with your brand color. Applies to borders, active nav items, and labels.
          </p>
          <div className="flex items-center gap-3">
            {/* Native color picker */}
            <input
              type="color"
              value={primaryColor || "#5a4f8a"}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded-md border border-gray-300 p-0.5"
              title="Pick a color"
            />
            {/* Hex input */}
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#5a4f8a"
              className="w-32 font-mono"
              maxLength={7}
            />
            {/* Preview swatch */}
            {primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor) && (
              <div
                className="h-8 w-16 rounded-md border border-gray-200 shadow-sm"
                style={{ backgroundColor: primaryColor }}
                title={primaryColor}
              />
            )}
            <Button type="button" size="sm" onClick={saveColor} disabled={savingColor}>
              {savingColor ? "Saving…" : "Save Color"}
            </Button>
            {primaryColor && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-400"
                onClick={() => {
                  setPrimaryColor("");
                  fetch("/api/settings/organization", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ primaryColor: null }),
                  });
                }}
              >
                <X className="h-4 w-4" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        {(logoPreview || primaryColor) && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
            <div
              className="flex items-center gap-3 rounded-lg p-3 w-fit"
              style={primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor)
                ? { borderBottom: `3px solid ${primaryColor}`, backgroundColor: "white" }
                : { borderBottom: "3px solid #e5e7eb", backgroundColor: "white" }
              }
            >
              {logoPreview && (
                <img src={logoPreview} alt={org.name} className="h-8 object-contain" />
              )}
              <span
                className="text-sm font-bold"
                style={primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor)
                  ? { color: primaryColor }
                  : {}}
              >
                {org.name}
              </span>
            </div>
          </div>
        )}

        {message && (
          <p className={`text-sm ${message.includes("ailed") || message.includes("nvalid") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
