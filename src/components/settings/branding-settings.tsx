"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Palette, Image as ImageIcon, Type, Mail, Eye, EyeOff, Building2 } from "lucide-react";

// Curated list of popular Google Fonts
const GOOGLE_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway",
  "Nunito", "Source Sans 3", "Oswald", "Merriweather", "Playfair Display",
  "PT Sans", "Ubuntu", "Noto Sans", "Work Sans", "Mulish", "Quicksand",
  "Josefin Sans", "DM Sans", "Outfit", "Manrope", "Figtree", "Plus Jakarta Sans",
  "Libre Baskerville", "EB Garamond", "Cormorant Garamond", "Lora", "Crimson Text",
  "Bitter", "Spectral", "IBM Plex Sans", "IBM Plex Serif", "Space Grotesk",
  "Sora", "Lexend", "Barlow", "Karla", "Cabin", "Rubik",
];

interface BrandingData {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  brandFont: string | null;
  emailSignature: string | null;
  name: string;
}

interface Props {
  org: BrandingData;
}

export default function BrandingSettings({ org }: Props) {
  const router = useRouter();
  const [practiceName, setPracticeName] = useState(org.name);
  const [savingName, setSavingName] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(org.logoUrl);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(org.faviconUrl);
  const [primaryColor, setPrimaryColor] = useState(org.primaryColor ?? "");
  const [brandFont, setBrandFont] = useState(org.brandFont ?? "Inter");
  const [fontSearch, setFontSearch] = useState("");
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [emailSignature, setEmailSignature] = useState(org.emailSignature ?? "");
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);
  const [savingColor, setSavingColor] = useState(false);
  const [savingFont, setSavingFont] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Load selected font in the picker for preview
  useEffect(() => {
    if (brandFont) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(brandFont)}:wght@400;600&display=swap`;
      link.id = `font-preview-${brandFont.replace(/\s/g, "-")}`;
      if (!document.getElementById(link.id)) document.head.appendChild(link);
    }
  }, [brandFont]);

  const filteredFonts = GOOGLE_FONTS.filter(f =>
    f.toLowerCase().includes(fontSearch.toLowerCase())
  );

  async function uploadFile(file: File, type: "logo" | "favicon") {
    setUploading(type);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/settings/branding/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error ?? "Upload failed"); return; }
      const url = `${data.url}?v=${Date.now()}`;
      if (type === "logo") setLogoPreview(url);
      else setFaviconPreview(url);
      setMessage(`${type === "logo" ? "Logo" : "Favicon"} updated! Reload to see changes.`);
    } finally {
      setUploading(null);
    }
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
      setMessage("Invalid color - use a hex value like #5a4f8a");
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
      if (!res.ok) setMessage(data.error ?? "Save failed");
      else setMessage("Brand color saved! Reload to see changes.");
    } finally { setSavingColor(false); }
  }

  async function saveFont(font: string) {
    setSavingFont(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandFont: font }),
      });
      if (res.ok) setMessage(`Font set to ${font}. Reload to see changes across the app.`);
      else setMessage("Failed to save font.");
    } finally { setSavingFont(false); setShowFontPicker(false); }
  }

  async function saveName() {
    if (!practiceName.trim()) { setMessage("Practice name is required."); return; }
    if (practiceName.length > 200) { setMessage("Name is too long."); return; }
    setSavingName(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: practiceName.trim() }),
      });
      if (res.ok) { setMessage("Practice name updated!"); router.refresh(); }
      else setMessage("Failed to save name.");
    } finally { setSavingName(false); }
  }

  async function saveSignature() {
    setSavingSignature(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailSignature: emailSignature || null }),
      });
      if (res.ok) setMessage("Email signature saved.");
      else setMessage("Failed to save signature.");
    } finally { setSavingSignature(false); }
  }

  const isValidColor = (c: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-indigo-600" />
          Branding
        </CardTitle>
        <p className="text-sm text-gray-500">
          Customize how your practice looks to you, your team, and in outgoing emails.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">

        {/* Practice Name */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Building2 className="h-4 w-4" /> Practice Name
          </Label>
          <p className="text-xs text-gray-500">Shown in the sidebar, topbar, emails, and everywhere your brand appears.</p>
          <div className="flex items-center gap-2">
            <Input
              value={practiceName}
              onChange={e => setPracticeName(e.target.value)}
              placeholder="Your Practice Name"
              maxLength={200}
              className="max-w-xs"
            />
            <Button type="button" size="sm" onClick={saveName} disabled={savingName || practiceName.trim() === org.name}>
              {savingName ? "Saving..." : "Save Name"}
            </Button>
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <ImageIcon className="h-4 w-4" /> Practice Logo
          </Label>
          <p className="text-xs text-gray-500">Shown in the sidebar and email headers. PNG, JPG, SVG, or WebP. Max 2 MB.</p>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
              {logoPreview
                ? <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-1" />
                : <span className="text-xs text-gray-400 text-center px-2">No logo</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" disabled={uploading === "logo"} onClick={() => logoInputRef.current?.click()}>
                <Upload className="mr-1 h-3.5 w-3.5" />
                {uploading === "logo" ? "Uploading..." : "Upload Logo"}
              </Button>
              {logoPreview && (
                <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeBrandingField("logoUrl")}>
                  <X className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "logo"); }} />
          </div>
        </div>

        {/* Favicon */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <ImageIcon className="h-4 w-4" /> Favicon
          </Label>
          <p className="text-xs text-gray-500">Browser tab icon. ICO, PNG, or SVG. Recommended 32Ã—32. Max 2 MB.</p>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
              {faviconPreview
                ? <img src={faviconPreview} alt="Favicon preview" className="h-8 w-8 object-contain" />
                : <span className="text-[10px] text-gray-400 text-center">None</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" disabled={uploading === "favicon"} onClick={() => faviconInputRef.current?.click()}>
                <Upload className="mr-1 h-3.5 w-3.5" />
                {uploading === "favicon" ? "Uploading..." : "Upload Favicon"}
              </Button>
              {faviconPreview && (
                <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeBrandingField("faviconUrl")}>
                  <X className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
            <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/svg+xml,image/gif" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "favicon"); }} />
          </div>
        </div>

        {/* Brand color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Palette className="h-4 w-4" /> Brand Color
          </Label>
          <p className="text-xs text-gray-500">Accent color for the app and email headers.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <input type="color" value={primaryColor || "#5a4f8a"} onChange={e => setPrimaryColor(e.target.value)} className="h-10 w-10 cursor-pointer rounded-md border border-gray-300 p-0.5" />
            <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#5a4f8a" className="w-32 font-mono" maxLength={7} />
            {primaryColor && isValidColor(primaryColor) && (
              <div className="h-8 w-16 rounded-md border border-gray-200 shadow-sm" style={{ backgroundColor: primaryColor }} />
            )}
            <Button type="button" size="sm" onClick={saveColor} disabled={savingColor}>
              {savingColor ? "Saving..." : "Save Color"}
            </Button>
            {primaryColor && (
              <Button type="button" variant="ghost" size="sm" className="text-gray-400" onClick={() => { setPrimaryColor(""); fetch("/api/settings/organization", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ primaryColor: null }) }); }}>
                <X className="h-4 w-4" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Brand font */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Type className="h-4 w-4" /> Brand Font
          </Label>
          <p className="text-xs text-gray-500">Applied to the app UI and all outgoing emails. Choose from Google Fonts.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex h-10 min-w-[160px] items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 cursor-pointer hover:border-gray-400"
              style={{ fontFamily: `'${brandFont}', system-ui, sans-serif` }}
              onClick={() => setShowFontPicker(v => !v)}
            >
              <span className="text-sm">{brandFont || "Select font"}</span>
              <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {savingFont && <span className="text-sm text-gray-500">Saving...</span>}
          </div>

          {showFontPicker && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <Input
                  autoFocus
                  placeholder="Search fonts..."
                  value={fontSearch}
                  onChange={e => setFontSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredFonts.map(font => {
                  // Preload the font in the browser
                  const fontId = `font-preview-${font.replace(/\s/g, "-")}`;
                  if (typeof window !== "undefined" && !document.getElementById(fontId)) {
                    const link = document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600&display=swap`;
                    link.id = fontId;
                    document.head.appendChild(link);
                  }
                  return (
                    <button
                      key={font}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${brandFont === font ? "bg-indigo-50 text-indigo-700" : ""}`}
                      style={{ fontFamily: `'${font}', system-ui, sans-serif` }}
                      onClick={() => { setBrandFont(font); saveFont(font); }}
                    >
                      <span>{font}</span>
                      <span className="text-xs text-gray-400" style={{ fontFamily: `'${font}', system-ui, sans-serif` }}>Aa Bb Cc</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Email signature */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Mail className="h-4 w-4" /> Email Signature
          </Label>
          <p className="text-xs text-gray-500">
            Appended to all outgoing emails. HTML is supported (bold, links, etc.).
          </p>
          <Textarea
            value={emailSignature}
            onChange={e => setEmailSignature(e.target.value)}
            placeholder={`e.g.\n<strong>Jane Smith, LMT</strong><br>\nRelax & Restore Massage<br>\nðŸ“ž (555) 123-4567 Â· <a href="https://example.com">book online</a>`}
            rows={5}
            className="font-mono text-sm"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" size="sm" onClick={saveSignature} disabled={savingSignature}>
              {savingSignature ? "Saving..." : "Save Signature"}
            </Button>
            {emailSignature && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-500"
                onClick={() => setShowSignaturePreview(v => !v)}
              >
                {showSignaturePreview ? <><EyeOff className="mr-1 h-3.5 w-3.5" /> Hide preview</> : <><Eye className="mr-1 h-3.5 w-3.5" /> Preview</>}
              </Button>
            )}
            {emailSignature && (
              <Button type="button" variant="ghost" size="sm" className="text-red-400" onClick={() => { setEmailSignature(""); fetch("/api/settings/organization", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailSignature: null }) }); }}>
                <X className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
          {showSignaturePreview && emailSignature && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm" style={{ fontFamily: `'${brandFont || "Inter"}', system-ui, sans-serif` }}>
              <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Signature preview</p>
              <div dangerouslySetInnerHTML={{ __html: emailSignature }} />
            </div>
          )}
        </div>

        {/* Email preview */}
        {(logoPreview || primaryColor || emailSignature) && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Mail className="h-4 w-4" /> Email Preview
            </Label>
            <div className="rounded-lg border border-gray-200 overflow-hidden text-sm" style={{ fontFamily: `'${brandFont || "Inter"}', system-ui, sans-serif` }}>
              <div className="p-4" style={{ backgroundColor: (primaryColor && isValidColor(primaryColor)) ? primaryColor : "#4f46e5" }}>
                {logoPreview && <img src={logoPreview} alt={practiceName} className="h-8 object-contain block mb-2" />}
                <span className="text-white font-semibold">{practiceName}</span>
              </div>
              <div className="p-4 bg-white">
                <p className="text-gray-600 mb-2">Hi [Client Name],</p>
                <p className="text-gray-800">Your email content will appear here.</p>
                {emailSignature && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: emailSignature }} />
                )}
              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-400">
                Sent via <strong>{practiceName}</strong>
              </div>
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
