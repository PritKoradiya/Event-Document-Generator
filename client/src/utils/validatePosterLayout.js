/**
 * Utility to validate poster data and layout constraints before export.
 * Logs warnings in development mode without interrupting production workflows.
 */

export function validatePosterLayout(posterProps, titleLines = [], descriptionLines = []) {
  if (!import.meta.env.DEV) return true;

  const warnings = [];

  if (!posterProps.posterTitle && !posterProps.mainTitle) {
    warnings.push("Poster title is missing or empty.");
  }

  if (titleLines.length > 3) {
    warnings.push(`Title line count exceeds 3 lines (current: ${titleLines.length}).`);
  }

  if (descriptionLines.length > 4) {
    warnings.push(`Description line count exceeds 4 lines (current: ${descriptionLines.length}).`);
  }

  if (!posterProps.templateStyle && !posterProps.designKey) {
    warnings.push("Template style / designKey is missing.");
  }

  if (warnings.length > 0) {
    console.warn("⚠️ Poster Layout Validation Warnings:", warnings);
  }

  return warnings.length === 0;
}
