import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  saveAuth0SettingsAction,
  saveSessionSettingsAction,
  saveSmtpSettingsAction,
  saveTelegramSettingsAction,
} from "@/app/actions/settings-actions";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function getSettingValue(
  settings: Array<{ key: string; value: unknown }>,
  key: string,
) {
  return settings.find((item) => item.key === key)?.value as
    | Record<string, string | number | boolean | null | undefined>
    | number
    | undefined;
}

export default async function SettingsPage() {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  const settings = await prisma.globalSetting.findMany({
    where: {
      key: {
        in: [
          "session_timeout_minutes",
          "auth0_settings",
          "smtp_settings",
          "telegram_settings",
        ],
      },
    },
  });

  const sessionTimeout = (getSettingValue(settings, "session_timeout_minutes") as number | undefined) ?? 120;
  const auth0 = (getSettingValue(settings, "auth0_settings") as Record<string, unknown> | undefined) ?? {};
  const smtp = (getSettingValue(settings, "smtp_settings") as Record<string, unknown> | undefined) ?? {};
  const telegram =
    (getSettingValue(settings, "telegram_settings") as Record<string, unknown> | undefined) ?? {};

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <span className="eyebrow">Configuracoes</span>
          <h1>Integracoes e politicas globais</h1>
          <p>
            Este painel concentra as referencias operacionais das configuracoes da plataforma. A
            execucao real ainda usa as variaveis de ambiente enquanto o fluxo de secrets nao e migrado.
          </p>
        </div>
      </section>

      <section className="ticketDetailGrid">
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Sessao</span>
              <h2>Tempo de logout automatico</h2>
            </div>
          </div>
          <SettingsForm
            action={saveSessionSettingsAction}
            submitLabel="Salvar sessao"
            fields={
              <label>
                Minutos de sessao
                <input name="timeoutMinutes" type="number" min="5" defaultValue={sessionTimeout} />
              </label>
            }
          />
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Auth0</span>
              <h2>SSO corporativo</h2>
            </div>
          </div>
          <SettingsForm
            action={saveAuth0SettingsAction}
            submitLabel="Salvar Auth0"
            fields={
              <>
                <label className="checkboxRow">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={Boolean(auth0.enabled)}
                  />
                  <span>SSO habilitado</span>
                </label>
                <label>
                  Issuer
                  <input name="issuer" type="text" defaultValue={String(auth0.issuer || "")} />
                </label>
                <label>
                  Client ID
                  <input name="clientId" type="text" defaultValue={String(auth0.clientId || "")} />
                </label>
                <label>
                  Secret hint
                  <input
                    name="clientSecretHint"
                    type="text"
                    defaultValue={String(auth0.clientSecretHint || "")}
                    placeholder="Ex.: armazenado no secret manager"
                  />
                </label>
              </>
            }
          />
        </section>
      </section>

      <section className="ticketDetailGrid">
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">SMTP</span>
              <h2>Emails da plataforma</h2>
            </div>
          </div>
          <SettingsForm
            action={saveSmtpSettingsAction}
            submitLabel="Salvar SMTP"
            fields={
              <>
                <label className="checkboxRow">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={Boolean(smtp.enabled)}
                  />
                  <span>SMTP habilitado</span>
                </label>
                <label>
                  Host
                  <input name="host" type="text" defaultValue={String(smtp.host || "")} />
                </label>
                <label>
                  Porta
                  <input name="port" type="text" defaultValue={String(smtp.port || "")} />
                </label>
                <label>
                  Usuario
                  <input name="userName" type="text" defaultValue={String(smtp.userName || "")} />
                </label>
                <label>
                  From
                  <input name="from" type="text" defaultValue={String(smtp.from || "")} />
                </label>
              </>
            }
          />
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Telegram</span>
              <h2>Bot de notificacoes</h2>
            </div>
          </div>
          <SettingsForm
            action={saveTelegramSettingsAction}
            submitLabel="Salvar Telegram"
            fields={
              <>
                <label className="checkboxRow">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={Boolean(telegram.enabled)}
                  />
                  <span>Telegram habilitado</span>
                </label>
                <label>
                  Chat ID
                  <input name="chatId" type="text" defaultValue={String(telegram.chatId || "")} />
                </label>
                <label>
                  Token hint
                  <input
                    name="botTokenHint"
                    type="text"
                    defaultValue={String(telegram.botTokenHint || "")}
                    placeholder="Ex.: token salvo no ambiente"
                  />
                </label>
              </>
            }
          />
        </section>
      </section>
    </main>
  );
}
