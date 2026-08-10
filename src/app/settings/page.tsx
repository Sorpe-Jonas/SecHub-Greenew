import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  saveAuth0SettingsAction,
  saveObjectStorageSettingsAction,
  savePlatformUrlsAction,
  saveSessionSettingsAction,
  saveSmtpSettingsAction,
  testObjectStorageConnectionAction,
  saveTelegramSettingsAction,
  testTelegramSettingsAction,
} from "@/app/actions/settings-actions";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireCurrentUser } from "@/lib/authz";
import { telegramNotificationCatalog } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";

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
          "platform_urls",
          "auth0_settings",
          "smtp_settings",
          "telegram_settings",
          "object_storage_settings",
        ],
      },
    },
  });
  const runtime = await getPlatformRuntimeConfig();
  const sessionTimeout = (settings.find((item) => item.key === "session_timeout_minutes")?.value as number | undefined) ?? 120;
  const auth0 = (settings.find((item) => item.key === "auth0_settings")?.value as Record<string, unknown> | undefined) ?? {};
  const smtp = (settings.find((item) => item.key === "smtp_settings")?.value as Record<string, unknown> | undefined) ?? {};
  const telegram = (settings.find((item) => item.key === "telegram_settings")?.value as Record<string, unknown> | undefined) ?? {};
  const objectStorage = (settings.find((item) => item.key === "object_storage_settings")?.value as Record<string, unknown> | undefined) ?? {};

  return (
    <AppShell
      role={user.role}
      permissions={user.blockPermissions}
      userName={user.name}
      userEmail={user.email}
      companyName={user.company?.name}
    >
      <section className="appPageHeader">
        <div>
          <span className="eyebrow">Configuracoes</span>
          <h1>Integracoes e politicas globais</h1>
          <p>
            Este painel concentra configuracoes operacionais da plataforma. SMTP, Telegram, URL
            publica e Grafana ja podem ser consumidos diretamente daqui.
          </p>
        </div>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Plataforma</span>
            <h2>URLs operacionais</h2>
          </div>
        </div>
        <SettingsForm
          action={savePlatformUrlsAction}
          submitLabel="Salvar URLs"
          fields={
            <>
              <label>
                URL publica principal
                <input name="appUrl" type="text" defaultValue={runtime.appUrl} />
              </label>
              <label>
                URL do Grafana
                <input name="grafanaUrl" type="text" defaultValue={runtime.grafanaUrl} />
              </label>
            </>
          }
        />
      </section>

      <section className="ticketDetailGrid">
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Object Storage</span>
              <h2>Backblaze B2 / S3 compatível</h2>
            </div>
          </div>
          <SettingsForm
            action={saveObjectStorageSettingsAction}
            submitLabel="Salvar storage"
            fields={
              <>
                <label className="checkboxRow">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={Boolean(objectStorage.enabled)}
                  />
                  <span>Storage externo habilitado</span>
                </label>
                <label>
                  Provider
                  <input name="provider" type="text" defaultValue={String(objectStorage.provider || "b2")} />
                </label>
                <label>
                  AWS_ACCESS_KEY_ID
                  <input name="accessKeyId" type="text" defaultValue={runtime.objectStorage.accessKeyId} />
                </label>
                <label>
                  AWS_SECRET_ACCESS_KEY
                  <input
                    name="secretAccessKey"
                    type="password"
                    defaultValue=""
                    placeholder={runtime.objectStorage.secretAccessKey ? "Ja cadastrado. Preencha apenas para trocar." : "Secret access key"}
                  />
                </label>
                <label>
                  Bucket
                  <input name="bucket" type="text" defaultValue={runtime.objectStorage.bucket} />
                </label>
                <label>
                  Regiao
                  <input name="region" type="text" defaultValue={runtime.objectStorage.region} />
                </label>
                <label>
                  Endpoint
                  <input name="endpoint" type="text" defaultValue={runtime.objectStorage.endpoint} />
                </label>
              </>
            }
          />
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Healthcheck</span>
              <h2>Testar conexao</h2>
            </div>
          </div>
          <SettingsForm
            action={testObjectStorageConnectionAction}
            submitLabel="Testar conexao"
            fields={
              <label>
                Arquivo de teste (opcional)
                <input name="testFile" type="file" />
              </label>
            }
          />
        </section>
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
                  <input
                    name="userName"
                    type="text"
                    defaultValue={runtime.smtp.user}
                    placeholder="usuario SMTP"
                  />
                </label>
                <label>
                  Senha
                  <input
                    name="password"
                    type="password"
                    defaultValue=""
                    placeholder={runtime.smtp.pass ? "Senha ja cadastrada. Preencha apenas para trocar." : "Senha SMTP"}
                  />
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
                  <input name="chatId" type="text" defaultValue={runtime.telegram.chatId} />
                </label>
                <div className="settingsOptionGroup">
                  <strong>Notificacoes enviadas pelo bot</strong>
                  <div className="settingsOptionList">
                    {telegramNotificationCatalog.map((event) => (
                      <label key={event.key} className="checkboxRow">
                        <input
                          name="notificationEvents"
                          type="checkbox"
                          value={event.key}
                          defaultChecked={runtime.telegram.notificationEvents.includes(event.key)}
                        />
                        <span>
                          {event.label}
                          <small>{event.description}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <label>
                  Bot token
                  <input
                    name="botToken"
                    type="password"
                    defaultValue=""
                    placeholder={runtime.telegram.botToken ? "Token ja cadastrado. Preencha apenas para trocar." : "Token do bot"}
                  />
                </label>
              </>
            }
          />
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Telegram</span>
              <h2>Testar bot</h2>
            </div>
          </div>
          <SettingsForm
            action={testTelegramSettingsAction}
            submitLabel="Enviar teste"
            pendingLabel="Testando..."
            fields={
              <p className="helperText">
                Envia uma mensagem modelo para o chat/canal configurado para validar token,
                permissao do bot e destino.
              </p>
            }
          />
        </section>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Segredos externos</span>
            <h2>Continuam fora da plataforma</h2>
          </div>
        </div>
        <div className="detailList">
          <div>
            <strong>DATABASE_URL</strong>
            <span>String de conexao do PostgreSQL. Vem do provedor do banco ou da sua infraestrutura.</span>
          </div>
          <div>
            <strong>AUTH_SECRET</strong>
            <span>Gere com `openssl rand -base64 32` ou com um comando Node que produza 32 bytes aleatorios em base64.</span>
          </div>
          <div>
            <strong>PASSWORD_ENCRYPTION_SECRET</strong>
            <span>Gere com o mesmo processo do `AUTH_SECRET`, mas use um valor separado e dedicado ao cofre.</span>
          </div>
          <div>
            <strong>AUTH_AUTH0_SECRET</strong>
            <span>Obtenha no painel do Auth0, em Applications, no client da aplicacao configurada para SSO.</span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
