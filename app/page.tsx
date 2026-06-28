import Header from "@/components/Header";
import Shortcuts from "@/components/Shortcuts";
import Notes from "@/components/Notes";
import News from "@/components/News";
import Dolar from "@/components/widgets/Dolar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 gap-[14px]">
      <Header />

      <main className="flex-1">
        <div className="layout-grid">
          {/* Izquierda */}
          <aside
            className="col-left flex flex-col gap-[14px] order-2"
            aria-label="Widgets"
          >
            <Notes />
            <Dolar />
          </aside>

          {/* Centro — protagonista */}
          <section
            className="col-center order-1 p-[14px]"
            aria-labelledby="shortcuts-heading"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--sh-sm)",
            }}
          >
            <h2
              id="shortcuts-heading"
              className="sr-only"
            >
              Accesos directos
            </h2>
            <Shortcuts />
          </section>

          {/* Derecha */}
          <aside className="col-right order-3">
            <News />
          </aside>
        </div>
      </main>
    </div>
  );
}
