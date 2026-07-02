export function populateSalespersonFilter(allEntries) {
  const select = document.getElementById('sp-filter');
  const current = select.value;
  const names = [...new Set(allEntries.map((e) => e.salesperson))].sort();

  select.innerHTML = '<option value="all">All Salespersons</option>' +
    names.map((n) => `<option value="${n}">${n}</option>`).join('');

  if (names.includes(current)) select.value = current;
}

export function setLastUpdated(allEntries) {
  const el = document.getElementById('last-updated');
  const spCount = new Set(allEntries.map((e) => e.salesperson)).size;
  el.textContent = `Updated ${new Date().toLocaleTimeString('en-MY')} · ${allEntries.length} entries · ${spCount} salespersons`;
}
