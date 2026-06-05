// Derive the persisted substitutions_allowed flag from note text.
// The UI no longer exposes a toggle; presence of text is the source of truth.
export function deriveSubstitutionsAllowed(
  note: string | null | undefined,
): boolean {
  return Boolean(note?.trim());
}
