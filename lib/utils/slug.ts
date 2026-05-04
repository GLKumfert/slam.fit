import { customAlphabet } from "nanoid";

// Exclude visually ambiguous characters: l, 1, 0, O
const nanoid = customAlphabet("abcdefghijkmnopqrstuvwxyz23456789", 6);

export function generateSlug(title: string): string {
  // Lowercase, replace spaces/special chars with hyphens, strip non-alphanumeric
  const slugified = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // collapse runs of non-alphanumeric into a single hyphen
    .replace(/^-+|-+$/g, "");    // strip leading/trailing hyphens

  // Truncate to 40 characters before appending the suffix
  const truncated = slugified.slice(0, 40);

  return `${truncated}-${nanoid()}`;
}
