/**
 * USA Date & Time Formatting Utilities
 * Date format: MM/DD/YYYY (e.g. 09/19/2026)
 * Time format: HH:MM AM/PM (e.g. 12:45 AM)
 */

export function formatDateUSA(dateInput) {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${mm}/${dd}/${yyyy}`;
}

export function formatTimeUSA(dateInput) {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' should be '12'
  const hh = String(hours).padStart(2, "0");

  return `${hh}:${minutes} ${ampm}`;
}

export function formatDateTimeUSA(dateInput) {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";

  const dateStr = formatDateUSA(d);
  const timeStr = formatTimeUSA(d);
  return `${dateStr} • ${timeStr}`;
}

export function formatTimelineBadge(dateInput, prefix = "Updated") {
  if (!dateInput) return `${prefix}: N/A`;
  const dateTimeStr = formatDateTimeUSA(dateInput);
  return `${prefix}: ${dateTimeStr}`;
}
