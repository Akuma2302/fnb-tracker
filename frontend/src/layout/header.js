export function setLastUpdated(allEntries) {
  const el = document.getElementById('last-updated');
  const spCount = new Set(allEntries.map((e) => e.salesperson)).size;
  el.textContent = `Updated ${new Date().toLocaleTimeString('en-MY')} · ${allEntries.length} entries · ${spCount} salespersons`;
}
