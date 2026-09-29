/**
 * Shared "tall, mobile-friendly" control heights for the Login and Settings
 * forms — ~1.5x the shadcn default 32px (h-8) baseline. Centralized here so
 * both screens read as one design system instead of duplicating the same
 * className strings at every call site.
 *
 * Radius is NOT set here: Input/Select/Button all default to full pill
 * rounding (rounded-full) in their own shared components now, so every
 * control in the app — not just these two screens — is pill-shaped at
 * whatever height it happens to be.
 */
export const TALL_INPUT_CLASS = "h-12";
export const TALL_SELECT_TRIGGER_CLASS = "data-[size=default]:h-12";
export const TALL_PILL_BUTTON_CLASS = "h-12 rounded-full";
