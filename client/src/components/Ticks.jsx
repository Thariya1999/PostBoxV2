// WhatsApp-style status: one grey tick = sent, two blue ticks = read
export default function Ticks({ read, total }) {
  const all = read === total;
  const some = read > 0;
  return (
    <span className={`ticks ${all ? 'read' : ''}`} title={`Read by ${read} of ${total}`}>
      {some ? '✓✓' : '✓'}
      {total > 1 && <small> {read}/{total}</small>}
    </span>
  );
}
