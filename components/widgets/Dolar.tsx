export default function Dolar() {
  return (
    <div
      className="p-3"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <p
        className="mb-1 text-[10px] uppercase"
        style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
      >
        Dólar
      </p>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        próximamente
      </p>
    </div>
  );
}
