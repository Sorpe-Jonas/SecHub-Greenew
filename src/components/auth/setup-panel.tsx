"use client";

import { useActionState } from "react";

import {
  type AuthFormState,
  bootstrapPlatformAction,
} from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthFormState = {};

export function SetupPanel() {
  const [state, action] = useActionState(bootstrapPlatformAction, initialState);

  return (
    <section className="authShell">
      <div className="authIntro">
        <span className="eyebrow">Primeiro Acesso</span>
        <h1>Configure a plataforma e crie o Admin Total inicial.</h1>
        <p>
          Este passo aparece apenas quando ainda nao existe nenhum usuario no banco. Aqui nasce a
          empresa inicial e o primeiro `SUPER_ADMIN`.
        </p>
        <div className="featureList">
          <div>
            <strong>Empresa inicial</strong>
            <span>Cria a primeira estrutura multiempresa para o portal.</span>
          </div>
          <div>
            <strong>Admin Total</strong>
            <span>Recebe acesso completo para configurar blocos, integracoes e usuarios.</span>
          </div>
          <div>
            <strong>Setup unico</strong>
            <span>Depois desse passo, o cadastro publico fica fechado e os acessos passam por convite.</span>
          </div>
        </div>
      </div>

      <div className="authCard">
        <form className="authForm" action={action}>
          <label>
            Nome da empresa inicial
            <input name="companyName" type="text" placeholder="Sua empresa" />
          </label>
          <label>
            Nome do Admin Total
            <input name="adminName" type="text" placeholder="Administrador Principal" />
          </label>
          <label>
            Email do Admin Total
            <input name="adminEmail" type="email" placeholder="admin@empresa.com" />
          </label>
          <label>
            Senha inicial
            <input name="password" type="password" placeholder="Minimo de 8 caracteres" />
          </label>
          {state.error ? <p className="errorText">{state.error}</p> : null}
          <SubmitButton idleLabel="Criar plataforma" pendingLabel="Criando..." />
        </form>
      </div>
    </section>
  );
}
