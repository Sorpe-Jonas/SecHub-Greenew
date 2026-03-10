"use client";

import Image from "next/image";
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
    <section className="loginShell">
      <div className="loginCard">
        <div className="loginBrand">
          <Image src="/sechub-logo.svg" alt="SecHub" width={164} height={44} priority />
          <p>Portal central de acesso interno.</p>
        </div>

        <div className="loginHeading">
          <span className="eyebrow">Acesso</span>
          <h1>Entrar</h1>
          <p>Use sua conta para acessar os modulos internos.</p>
        </div>

        {auth0Enabled ? (
          <form action={loginWithAuth0}>
            <button className="secondaryButton" type="submit">
              Continuar com SSO Auth0
            </button>
          </form>
        ) : null}

        {auth0Enabled ? (
          <div className="divider">
            <span>ou use uma conta local</span>
          </div>
        ) : null}

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
          Novas contas sao liberadas apenas por convite interno.
          <Link href="/dashboard"> Ir para o dashboard.</Link>
        </p>
      </div>
    </section>
  );
}
