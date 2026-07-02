/**
 * Fetches the full dashboard payload: { entries, skus, targets }
 */
export async function fetchDashboardData() {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
