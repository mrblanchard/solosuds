"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const THEMES = [
  { id: "lavender", label: "Lavender", color: "#7c6fac", bg: "#f5f2fb" },
  { id: "ocean", label: "Ocean", color: "#1a66b5", bg: "#f0f7ff" },
  { id: "sage", label: "Sage", color: "#3f6f41", bg: "#f2f7f2" },
  { id: "rose", label: "Rose", color: "#b33a5c", bg: "#fdf2f5" },
  { id: "sunset", label: "Sunset", color: "#c05f1a", bg: "#fff7f0" },
  { id: "slate", label: "Slate", color: "#4d5570", bg: "#f4f5f7" },
  { id: "royal", label: "Royal", color: "#c4acf0", bg: "#1e1736", dark: true },
  { id: "midnight", label: "Midnight", color: "#9d8fda", bg: "#131118", dark: true },
] as const;

interface Props {
  currentTheme: string;
}

export default function ThemePicker({ currentTheme }: Props) {
  const initial = currentTheme || "lavender";
  const [theme, setTheme] = useState(initial);
  const [savedTheme, setSavedTheme] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const isDirty = theme !== savedTheme;

  useEffect(() => {
    // Live preview — apply immediately so picking a swatch shows the effect
    // right away, even before it's saved.
    if (theme === "lavender") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  function selectTheme(id: string) {
    setTheme(id);
    setError(null);
    setJustSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save theme");
      }
      setSavedTheme(theme);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save theme");
      // Revert the live preview back to what's actually saved.
      setTheme(savedTheme);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Theme</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Choose a color scheme for your dashboard. Pick one to preview it, then save to keep it.
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTheme(t.id)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                theme === t.id
                  ? "border-gray-900 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {theme === t.id && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
              <div className="flex gap-1">
                <div
                  className="h-8 w-4 rounded-l-md"
                  style={{ backgroundColor: t.bg }}
                />
                <div
                  className="h-8 w-4"
                  style={{ backgroundColor: t.color }}
                />
                <div
                  className="h-8 w-4 rounded-r-md"
                  style={{ backgroundColor: t.color, opacity: 0.6 }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700">{t.label}</span>
              {"dark" in t && t.dark && (
                <span className="text-[10px] -mt-1 text-gray-400">Dark</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={save} disabled={saving || !isDirty}>
            {saving ? "Saving…" : "Save Theme"}
          </Button>
          {justSaved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          {!justSaved && isDirty && !saving && (
            <span className="text-sm text-gray-400">Unsaved changes</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
