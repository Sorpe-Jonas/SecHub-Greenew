"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  type AuthFormState,
  loginWithAuth0,
  loginWithPassword,
} from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthFormState = {};

export function AuthPanel({ auth0Enabled }: { auth0Enabled: boolean }) {
  const [loginState, loginAction] = useActionState(loginWithPassword, initialState);

  return (
    <section className="authShell">
      <div className="authIntro">
        <span className="eyebrow">SecHub Greenew</span>
        <h1>Uma porta de entrada unica para os apps internos.</h1>
        <p>
          O login principal abre acesso aos modulos iniciais de senhas, suporte e observabilidade.
        </p>
        <div className="featureList">
          <div>
            <strong>SSO com Auth0</strong>
            <span>Federacao centralizada para identidades corporativas.</span>
          </div>
          <div>
            <strong>Email e senha</strong>
            <span>Fluxo proprio para contas locais armazenadas em PostgreSQL.</span>
          </div>
          <div>
            <strong>Dashboard modular</strong>
            <span>Base pronta para adicionar novos cards e aplicativos depois.</span>
          </div>
        </div>
      </div>

      <div className="authCard">
        <div className="modeSwitch singleMode" role="tablist" aria-label="Modo de autenticacao local">
          <span className="modeButton active">Entrar</span>
        </div>

        {auth0Enabled ? (
          <form action={loginWithAuth0}>
            <button className="secondaryButton" type="submit">
              Continuar com SSO Auth0
            </button>
          </form>
        ) : (
          <div className="notice">
            Configure `AUTH_AUTH0_ID`, `AUTH_AUTH0_SECRET` e `AUTH_AUTH0_ISSUER` para habilitar o SSO.
          </div>
        )}

        <div className="divider">
          <span>ou use uma conta local</span>
        </div>

        <form className="authForm" action={loginAction}>
          <label>
            Email
            <input name="email" type="email" placeholder="voce@empresa.com" />
          </label>
          <label>
            Senha
            <input name="password" type="password" placeholder="Sua senha" />
          </label>
          {loginState.error ? <p className="errorText">{loginState.error}</p> : null}
          <SubmitButton idleLabel="Entrar no portal" pendingLabel="Entrando..." />
        </form>

        <p className="helperText">
          O cadastro aberto fica desabilitado depois do primeiro acesso. Novas contas devem ser
          criadas por convite interno.
          <Link href="/dashboard"> Ver demonstracao protegida.</Link>
        </p>
      </div>
    </section>
  );
}
