/**
 * Shared "tall, mobile-friendly" control styling for the Login and Settings
 * forms — ~1.5x the shadcn default 32px (h-8) baseline, with a larger corner
 * radius on inputs/select and full pill rounding on buttons. Centralized here
 * so both screens read as one design system instead of duplicating the same
 * className strings at every call site.
 */
// rounded-[20px] rather than the theme's rounded-2xl: at 48px tall, a radius
// past half the height (24px) auto-clamps to a full stadium/pill shape,
// which would make inputs visually indistinguishable from the pill buttons
// below. 20px reads as clearly "larger, softer" than the app's normal
// rounded-lg (18px) while staying a distinct shape from the buttons.
export const TALL_INPUT_CLASS = "h-12 rounded-[20px]";
export const TALL_SELECT_TRIGGER_CLASS = "data-[size=default]:h-12 rounded-[20px]";
export const TALL_PILL_BUTTON_CLASS = "h-12 rounded-full";
