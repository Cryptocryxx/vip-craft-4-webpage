"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}

/** "Join Server"-Button: kopiert die Server-IP in die Zwischenablage. */
export function JoinServerButton({ ip, className }: { ip: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(ip);
      ok = true;
    } catch {
      ok = fallbackCopy(ip);
    }
    setState(ok ? "copied" : "error");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={cn("btn btn-lg", state === "copied" ? "btn-diamond" : "btn-brass", className)}
    >
      {state === "copied" ? <Check className="size-5" /> : <Copy className="size-5" />}
      <span>{state === "copied" ? "IP kopiert!" : state === "error" ? "Kopieren fehlgeschlagen" : "Join Server"}</span>
      <span className="ml-1 hidden rounded-md bg-black/15 px-2 py-0.5 font-mono text-xs font-normal tracking-normal sm:inline">
        {ip}
      </span>
    </button>
  );
}
