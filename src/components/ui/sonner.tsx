"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/**
 * Sonner renders each toast as an `<li tabindex="0">`, portaled to the very
 * end of <body>. Since it's the last focusable node in the document, tabbing
 * forward from it has nowhere natural to go — verified this traps real
 * keyboard focus in a Tab↔toast loop that never reaches the rest of the page
 * (WCAG 2.1.2 keyboard trap). These toasts are transient confirmations
 * (they auto-dismiss and are already announced to screen readers via
 * aria-live) — not something a keyboard user needs to Tab into — so this
 * strips them from the tab order instead.
 */
function useDisableToastTabStop() {
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const toasts = node.matches("[data-sonner-toast]")
            ? [node]
            : Array.from(node.querySelectorAll("[data-sonner-toast]"));
          for (const toast of toasts) toast.setAttribute("tabindex", "-1");
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  useDisableToastTabStop()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
