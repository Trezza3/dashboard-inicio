"use client";

import { useEffect, useState } from "react";
import { IconPlayerPause, IconPlayerPlay, IconRotateClockwise } from "@tabler/icons-react";

const FOCUS_SECONDS = 25 * 60;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export default function FocusMode() {
  const [task, setTask] = useState("");
  const [seconds, setSeconds] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(id);
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [running]);

  function reset() {
    setRunning(false);
    setSeconds(FOCUS_SECONDS);
  }

  return (
    <section
      aria-label="Modo foco"
      className="flex flex-col gap-2 p-3"
      style={{
        background: "var(--ink)",
        color: "var(--paper)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "3px 3px 0 0 var(--coral)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
        >
          Foco
        </p>
        <span
          className="text-[10px] tabular-nums"
          style={{ fontFamily: "var(--font-head)", color: "var(--lime)" }}
        >
          {formatTime(seconds)}
        </span>
      </div>

      <input
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Tarea activa"
        className="w-full px-2 py-1.5 text-xs outline-none"
        style={{
          background: "var(--paper)",
          color: "var(--ink)",
          border: "2px solid var(--paper)",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-sans)",
        }}
      />

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setRunning((value) => !value)}
          className="tile flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[10px] uppercase"
          style={{
            background: "var(--lime)",
            color: "var(--ink)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
            fontFamily: "var(--font-head)",
          }}
        >
          {running ? <IconPlayerPause size={13} stroke={2.5} /> : <IconPlayerPlay size={13} stroke={2.5} />}
          {running ? "Pausar" : "Empezar"}
        </button>
        <button
          type="button"
          aria-label="Reiniciar foco"
          onClick={reset}
          className="tile flex h-[31px] w-[31px] items-center justify-center"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
          }}
        >
          <IconRotateClockwise size={14} stroke={2.5} color="var(--ink)" />
        </button>
      </div>
    </section>
  );
}
