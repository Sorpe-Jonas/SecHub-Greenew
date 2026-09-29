"use client";

import { useActionState } from "react";

import { type LeadFormState, createLeadAction } from "@/app/actions/lead-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: LeadFormState = {};

export function LeadCaptureForm() {
  const [state, action] = useActionState(createLeadAction, initialState);

  return (
    <form className="authForm" action={action}>
      <label>
        Nome
        <input name="name" type="text" placeholder="Seu nome completo" required />
      </label>
      <label>
        Telefone
        <input name="phone" type="tel" placeholder="(00) 00000-0000" required />
      </label>
      <label>
        Empresa
        <input name="companyName" type="text" placeholder="Nome da empresa" required />
      </label>
      <label>
        E-mail
        <input name="email" type="email" placeholder="voce@empresa.com" required />
      </label>
      <label>
        Descricao
        <textarea
          className="textareaInput"
          name="description"
          rows={4}
          placeholder="Conte rapidamente o que sua empresa precisa"
          required
        />
      </label>

      <input
        aria-hidden="true"
        autoComplete="off"
        name="website"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        tabIndex={-1}
        type="text"
      />

      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Enviar dados" pendingLabel="Enviando..." />
    </form>
  );
}
