"use client";

import { useEffect, useMemo, useState } from "react";

import { startTimerAction, stopTimerAction } from "@/app/actions/timesheet-actions";

function formatDuration(startedAt: string) {
  const diff = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

type RunningTimerCardProps = {
  runningTimer: {
    id: string;
    startedAt: string;
    ticketId: string | null;
  } | null;
  ticketOptions: Array<{
    id: string;
    title: string;
  }>;
};

export function RunningTimerCard({ runningTimer, ticketOptions }: RunningTimerCardProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!runningTimer) {
      return;
    }

    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => undefined);
      } else if (Notification.permission === "granted") {
        new Notification("TimeSheet em andamento", {
          body: "O timer de atendimento foi iniciado e permanece rodando.",
        });
      }
    }

    return () => window.clearInterval(interval);
  }, [runningTimer]);

  const counter = runningTimer ? formatDuration(runningTimer.startedAt) : "00:00:00";

  const selectedTicketLabel = useMemo(() => {
    if (!runningTimer?.ticketId) {
      return "Sem ticket vinculado";
    }

    return ticketOptions.find((ticket) => ticket.id === runningTimer.ticketId)?.title || "Ticket vinculado";
  }, [runningTimer, ticketOptions]);

  if (runningTimer) {
    return (
      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Atendimento em andamento</span>
            <h2>{counter}</h2>
          </div>
        </div>
        <div className="detailList">
          <div>
            <strong>Inicio</strong>
            <span>{new Date(runningTimer.startedAt).toLocaleString("pt-BR")}</span>
          </div>
          <div>
            <strong>Ticket</strong>
            <span>{selectedTicketLabel}</span>
          </div>
          <div>
            <strong>Notificacao web</strong>
            <span>O navegador pode avisar que o timer segue ativo enquanto a aba estiver aberta.</span>
          </div>
        </div>
        <form className="ticketForm" action={stopTimerAction}>
          <input type="hidden" name="timerId" value={runningTimer.id} />
          <label>
            Descricao final
            <textarea
              className="textareaInput"
              name="description"
              rows={4}
              placeholder="Resumo do atendimento realizado neste periodo."
            />
          </label>
          <button className="primaryButton" type="submit">
            Encerrar atendimento
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="supportPanel">
      <div className="panelHeader">
        <div>
          <span className="eyebrow">Timer</span>
          <h2>Iniciar atendimento</h2>
        </div>
      </div>
      <form className="ticketForm" action={startTimerAction}>
        <label>
          Ticket opcional
          <select className="selectInput" name="ticketId" defaultValue="">
            <option value="">Sem ticket</option>
            {ticketOptions.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.title}
              </option>
            ))}
          </select>
        </label>
        <button className="primaryButton" type="submit">
          Iniciar agora
        </button>
      </form>
    </section>
  );
}
