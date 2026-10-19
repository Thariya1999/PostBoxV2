export function fmt(date, long = false) {
  const d = new Date(date);
  const sameDay = d.toDateString() === new Date().toDateString();
  if (long) return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
