"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface SavedToastProps {
  show: boolean;
  message?: string;
}

export default function SavedToast({ show, message = "Layout saved" }: SavedToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <Check className="h-4 w-4" />
        {message}
      </div>
    </div>
  );
}
