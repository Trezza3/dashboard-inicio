import Header from "@/components/Header";
import Shortcuts from "@/components/Shortcuts";
import Notes from "@/components/Notes";
import News from "@/components/News";
import Agenda from "@/components/Agenda";
import Projects from "@/components/Projects";
import MediaPlayer from "@/components/MediaPlayer";
import Sessions from "@/components/Sessions";
import WeatherCompact from "@/components/WeatherCompact";
import Dolar from "@/components/widgets/Dolar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header sticky — siempre visible al scrollear */}
      <div
        className="sticky top-0 z-20 px-4 sm:px-6 pt-4 sm:pt-6 pb-3"
        style={{ background: "var(--band)", borderBottom: "2px solid var(--ink)" }}
      >
        <Header />
      </div>

      <main className="flex-1 px-4 sm:px-6 pt-4 sm:pt-5 pb-6">
        <div className="layout-grid">
          {/* Izquierda sticky */}
          <aside
            className="col-left flex flex-col gap-[14px] order-2 md:sticky md:top-[90px] md:self-start"
            aria-label="Widgets"
          >
            <Notes />
            <Dolar />
            <WeatherCompact />
          </aside>

          {/* Centro — protagonista */}
          <div className="col-center order-1 flex flex-col gap-[14px] self-start mx-auto">
            <section
              className="p-[14px]"
              aria-labelledby="shortcuts-heading"
              style={{
                width: "100%",
                background: "var(--surface)",
                border: "2px solid var(--ink)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--sh-sm)",
              }}
            >
              <h2 id="shortcuts-heading" className="sr-only">
                Accesos directos
              </h2>
              <Shortcuts />
            </section>
            <Agenda />
          </div>

          {/* Derecha sticky */}
          <aside
            className="col-right order-3 flex flex-col gap-[14px] md:sticky md:top-[90px] md:self-start"
          >
            <Sessions />
            <Projects />
            <MediaPlayer />
            <News />
          </aside>
        </div>
      </main>
    </div>
  );
}
