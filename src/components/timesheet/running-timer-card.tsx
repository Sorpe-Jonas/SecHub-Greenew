"use client";

import { useEffect, useState } from "react";

import { startTimerAction, stopTimerAction } from "@/app/actions/timesheet-actions";

function getElapsedSeconds(startedAt: string) {
  const diff = Math.max(0, Date.now() - new Date(startedAt).getTime());
  return Math.floor(diff / 1000);
}

function formatDurationFromSeconds(totalSeconds: number) {
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
    let notificationInterval: number | null = null;

    async function syncActiveTimerNotification() {
      if (!runningTimer || !("serviceWorker" in navigator) || !("Notification" in window)) {
        return;
      }

      if (Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          return;
        }
      }

      if (Notification.permission !== "granted") {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const ticketLabel = runningTimer.ticketId
        ? ticketOptions.find((ticket) => ticket.id === runningTimer.ticketId)?.title || "Ticket vinculado"
        : "Sem ticket vinculado";

      const pushUpdate = () => {
        registration.active?.postMessage({
          type: "SHOW_ACTIVE_TIMER",
          seconds: getElapsedSeconds(runningTimer.startedAt),
          ticketLabel,
        });
      };

      pushUpdate();
      notificationInterval = window.setInterval(pushUpdate, 1000);
    }

    if (!runningTimer) {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.active?.postMessage({ type: "CLOSE_ACTIVE_TIMER" });
          })
          .catch(() => undefined);
      }
      return;
    }

    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);
    syncActiveTimerNotification().catch(() => undefined);

    return () => {
      window.clearInterval(interval);
      if (notificationInterval) {
        window.clearInterval(notificationInterval);
      }
    };
  }, [runningTimer, ticketOptions]);

  const counter = runningTimer ? formatDurationFromSeconds(getElapsedSeconds(runningTimer.startedAt)) : "00:00:00";
  const selectedTicketLabel = runningTimer?.ticketId
    ? ticketOptions.find((ticket) => ticket.id === runningTimer.ticketId)?.title || "Ticket vinculado"
    : "Sem ticket vinculado";

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
            <span>Ao iniciar, o app publica uma notificacao persistente com o tempo correndo.</span>
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
