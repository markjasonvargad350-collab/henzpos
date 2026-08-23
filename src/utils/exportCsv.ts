/**
 * CSV export used by the Clear Old Records housekeeping tool.
 *
 * These files are the ONLY surviving copy of a purged sale or pre-order, so the
 * escaping here has to be right — a product name containing a comma, or a note
 * containing a line break, must not shift every following column.
 */

/**
 * Quotes a single field for CSV.
 *
 * Also neutralises formula injection: a value beginning with = + - @ (or a tab /
 * carriage return) is executed as a formula when the file is opened in Excel or
 * Sheets. Customer names and order notes are free text typed by the public, so
 * they are prefixed with a single quote to force Excel to treat them as text.
 */
const escapeField = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  // Always quote. Simpler than deciding per value, and valid CSV either way.
  return `"${text.replace(/"/g, '""')}"`;
};

/** Builds a complete CSV document, including a UTF-8 BOM so Excel reads ₱ and é correctly. */
export const buildCsv = (headers: string[], rows: unknown[][]): string => {
  const lines = [headers.map(escapeField).join(','), ...rows.map((r) => r.map(escapeField).join(','))];
  // CRLF line endings — what Excel on Windows expects.
  return `﻿${lines.join('\r\n')}\r\n`;
};

/**
 * Triggers a browser download and resolves once the file has been handed to the
 * browser. The caller awaits this before deleting anything, so a failed export
 * cannot be followed by a successful purge.
 */
export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser a moment to start reading the blob before revoking it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
