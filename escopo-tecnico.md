# Escopo Tecnico

## Objetivo

Traduzir o documento funcional em uma base tecnica clara para implementacao do portal SecHub Greenew.

## Stack Base Recomendada

- Frontend: Next.js App Router
- Backend: rotas e server actions no proprio Next.js
- Autenticacao: Auth.js com Auth0 + credenciais locais
- Banco: PostgreSQL
- ORM: Prisma
- PWA: manifest, service worker e notificacoes web
- Email: SMTP configuravel
- Mensageria: Telegram Bot API
- Observabilidade: logs estruturados + auditoria persistida em banco

## Principios Tecnicos

- Multiempresa desde a primeira migracao.
- Permissao por role e por bloco.
- Auditoria como parte central da arquitetura.
- Dados sensiveis com criptografia forte em repouso.
- Acesso a dados sempre escopado por empresa, exceto Admin Total.
- Estrutura preparada para crescimento modular.

## Modulos do Sistema

- Autenticacao e sessao
- Empresas
- Usuarios e permissoes
- Dashboard
- Senhas
- Tickets
- TimeSheet
- Financeiro
- Auditoria
- Configuracoes globais
- Notificacoes

## Modelo de Permissoes

### Roles globais

- `SUPER_ADMIN`
- `ADMIN`
- `USER`

### Blocos permissionaveis

- `PASSWORDS`
- `TICKETS`
- `GRAFANA`
- `TIMESHEET`
- `FINANCIAL`
- `USERS`
- `COMPANIES`
- `AUDIT`
- `SETTINGS`

### Regras

- `SUPER_ADMIN` pode ver todas as empresas e todos os blocos.
- `ADMIN` atua apenas dentro da propria empresa.
- `USER` atua apenas dentro da propria empresa e apenas nos blocos liberados.
- Alem da role, cada usuario tera permissoes explicitas por bloco.
- Blocos visiveis no dashboard serao derivados das permissoes efetivas.

## Entidades Principais

## Empresa

Responsavel pelo isolamento de dados.

Campos sugeridos:

- `id`
- `name`
- `slug`
- `status`
- `createdAt`
- `updatedAt`

## Usuario

Representa a pessoa autenticada na plataforma.

Campos sugeridos:

- `id`
- `companyId`
- `name`
- `email`
- `passwordHash`
- `role`
- `status`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

## UserBlockPermission

Define quais blocos o usuario pode acessar.

Campos sugeridos:

- `id`
- `userId`
- `block`
- `canView`
- `canCreate`
- `canEdit`
- `canDelete`
- `createdAt`
- `updatedAt`

## AuditLog

Registro central de eventos do sistema.

Campos sugeridos:

- `id`
- `companyId`
- `userId`
- `module`
- `action`
- `entityType`
- `entityId`
- `description`
- `ipAddress`
- `userAgent`
- `metadata`
- `createdAt`

## PasswordVault

Aglomerador logico do cofre por empresa, categoria ou ambiente.

Campos sugeridos:

- `id`
- `companyId`
- `name`
- `description`
- `createdAt`
- `updatedAt`

## PasswordEntry

Credencial armazenada no modulo de senhas.

Campos sugeridos:

- `id`
- `companyId`
- `vaultId`
- `title`
- `username`
- `encryptedPassword`
- `url`
- `notes`
- `tags`
- `faviconUrl`
- `createdById`
- `updatedById`
- `createdAt`
- `updatedAt`
- `deletedAt`

## PasswordEntryVersion

Historico para rollback.

Campos sugeridos:

- `id`
- `passwordEntryId`
- `versionNumber`
- `title`
- `username`
- `encryptedPassword`
- `url`
- `notes`
- `snapshotById`
- `createdAt`

## Ticket

Entidade principal do sistema de suporte.

Campos sugeridos:

- `id`
- `companyId`
- `openedById`
- `assignedToId`
- `category`
- `subcategory`
- `title`
- `description`
- `priority`
- `status`
- `origin`
- `createdAt`
- `updatedAt`
- `closedAt`

## TicketMessage

Comentarios e interacoes do ticket.

Campos sugeridos:

- `id`
- `ticketId`
- `authorId`
- `message`
- `isInternal`
- `createdAt`

## TicketAttachment

Anexos do chamado.

Campos sugeridos:

- `id`
- `ticketId`
- `uploadedById`
- `fileName`
- `mimeType`
- `storagePath`
- `createdAt`

## TimeEntry

Lancamento de horas trabalhadas.

Campos sugeridos:

- `id`
- `companyId`
- `userId`
- `ticketId`
- `description`
- `entryType`
- `startedAt`
- `endedAt`
- `durationMinutes`
- `isManualEdit`
- `createdAt`
- `updatedAt`

## RunningTimer

Timer em andamento para atendimento ativo.

Campos sugeridos:

- `id`
- `companyId`
- `userId`
- `ticketId`
- `startedAt`
- `status`
- `createdAt`
- `updatedAt`

## VisitEntry

Registro de visita presencial.

Campos sugeridos:

- `id`
- `companyId`
- `userId`
- `ticketId`
- `visitDate`
- `description`
- `amount`
- `createdAt`

## FinancialProfile

Parametros financeiros por empresa.

Campos sugeridos:

- `id`
- `companyId`
- `includedHours`
- `hourlyRate`
- `extraHourlyRate`
- `visitRate`
- `billingDay`
- `createdAt`
- `updatedAt`

## FinancialStatement

Resumo financeiro por competencia.

Campos sugeridos:

- `id`
- `companyId`
- `referenceMonth`
- `includedHoursUsed`
- `extraHoursUsed`
- `visitCount`
- `subtotal`
- `total`
- `status`
- `createdAt`
- `updatedAt`

## FinancialDocument

Documentos anexados no financeiro.

Campos sugeridos:

- `id`
- `financialStatementId`
- `documentType`
- `fileName`
- `storagePath`
- `isAvailableToClient`
- `uploadedById`
- `createdAt`

## NotificationConfig

Configuracoes de envio.

Campos sugeridos:

- `id`
- `companyId`
- `type`
- `enabled`
- `config`
- `createdAt`
- `updatedAt`

## CompanyNotificationRecipient

Emails de recebimento automatico.

Campos sugeridos:

- `id`
- `companyId`
- `email`
- `type`
- `active`
- `createdAt`

## Configuracoes Globais

Configuracoes exclusivas do Admin Total.

Campos sugeridos:

- `id`
- `key`
- `value`
- `updatedById`
- `updatedAt`

## Relacionamentos Criticos

- Empresa possui muitos usuarios.
- Empresa possui muitos tickets.
- Empresa possui muitas credenciais.
- Empresa possui muitos lancamentos de horas.
- Empresa possui um perfil financeiro.
- Usuario pertence a uma empresa.
- Usuario possui permissoes por bloco.
- Ticket pertence a uma empresa e pode ter muitas mensagens.
- TimeEntry pode se vincular a Ticket.
- PasswordEntry possui muitas versoes.
- AuditLog pode referenciar qualquer modulo.

## Regras de Negocio por Modulo

## Autenticacao

- Suporta Auth0 e email/senha.
- Primeiro acesso sem usuarios cria fluxo de onboarding do `SUPER_ADMIN`.
- Sessao expira conforme configuracao global.
- PWA deve suportar login mobile e reentrada segura.

## Empresas

- Apenas `SUPER_ADMIN` cria empresas.
- Empresa nasce com status ativo.
- Empresa pode ter configuracoes proprias futuramente.

## Usuarios

- `SUPER_ADMIN` cria qualquer usuario.
- `ADMIN` cria usuarios apenas da propria empresa.
- Convite enviado por email.
- Usuario pode ser ativado no primeiro acesso.

## Dashboard

- Cards visiveis dependem de role + bloco permitido.
- Deve existir suporte a cards internos e externos.
- Grafana inicialmente pode ser apenas link externo configuravel.

## Senhas

- CRUD por empresa.
- Exportacao apenas para `ADMIN` e `SUPER_ADMIN`.
- Visualizar, copiar e restaurar senha gera log obrigatorio.
- Cada alteracao gera nova versao historica.
- Limite de 20 versoes por credencial.

## Tickets

- Usuario abre ticket por card e subcard.
- Ticket aceita anexo de imagem.
- User ve apenas tickets proprios.
- Resposta de User gera notificacao no Telegram.
- Resposta de Admin ou Super Admin gera email ao solicitante.

## TimeSheet

- Disponivel apenas para `SUPER_ADMIN` no P1/P2.
- Pode iniciar atendimento em tempo real.
- Timer ativo deve continuar visivel e recuperavel.
- Registro pode ser editado manualmente depois.
- Timer pode opcionalmente estar vinculado a um ticket.

## Financeiro

- Dados agregados a partir de TimeEntry e VisitEntry.
- Cliente visualiza apenas dados da propria empresa.
- Documentos sao anexados manualmente.
- Sistema envia avisos recorrentes ate pagamento ser marcado.

## Auditoria

- Deve registrar eventos de autenticacao, visualizacao sensivel, alteracoes e exclusoes.
- Logs devem carregar empresa, usuario, IP, contexto e timestamp.
- Auditoria do modulo de senhas e obrigatoria desde o inicio.

## Eventos Auditaveis Obrigatorios

- Login bem-sucedido
- Login falho
- Logout
- Criacao de empresa
- Criacao de usuario
- Alteracao de permissao
- Visualizacao de senha
- Copia de senha
- Copia de username
- Criacao de credencial
- Edicao de credencial
- Exclusao de credencial
- Restore de credencial
- Criacao de ticket
- Alteracao de status de ticket
- Resposta em ticket
- Inicio de timer
- Encerramento de timer
- Edicao manual de horas
- Upload de documento financeiro
- Alteracao de configuracao global

## Fluxos Tecnicos Essenciais

## Fluxo 1: Primeiro acesso

1. Aplicacao sobe.
2. Sistema verifica se existe algum usuario.
3. Se nao existir, abre onboarding de criacao do `SUPER_ADMIN`.
4. Salva usuario inicial.
5. Direciona para configuracoes basicas.

## Fluxo 2: Criacao de empresa

1. `SUPER_ADMIN` cria empresa.
2. Sistema gera registro de empresa.
3. `SUPER_ADMIN` cria admin da empresa ou envia convite.
4. Auditoria registra criacao.

## Fluxo 3: Criacao de usuario

1. Admin escolhe empresa.
2. Define role.
3. Define blocos permitidos.
4. Sistema cria usuario pendente.
5. Dispara email de convite.

## Fluxo 4: Abertura de ticket

1. User escolhe card principal.
2. User escolhe subcard.
3. Formulario vem pre-preenchido.
4. Ticket e salvo.
5. Telegram recebe notificacao formatada.
6. Auditoria registra o evento.

## Fluxo 5: Timer do TimeSheet

1. `SUPER_ADMIN` aciona "Iniciar atendimento".
2. Sistema cria `RunningTimer`.
3. PWA mostra estado visual e notificacao local.
4. Ao encerrar, sistema converte em `TimeEntry`.
5. Usuario pode editar depois, com log.

## Estrategia de Seguranca para o Modulo de Senhas

- Criptografia server-side com chave fora do banco.
- Segredo de criptografia separado do `AUTH_SECRET`.
- Nunca retornar senha descriptografada sem autorizacao valida.
- Operacoes sensiveis com auditoria obrigatoria.
- Exportacao protegida por role.
- Historico de versoes tambem precisa ficar criptografado.

## Backlog Tecnico

## P1

- Estruturar base Next.js + Auth.js + Prisma + PostgreSQL.
- Criar modelo de empresa, usuario, role e permissao por bloco.
- Criar fluxo de onboarding do primeiro `SUPER_ADMIN`.
- Implementar dashboard dinamico por permissao.
- Implementar modulo base de tickets.
- Implementar modulo base de senhas.
- Implementar auditoria central.
- Implementar configuracoes globais iniciais.
- Implementar envio de email por SMTP.
- Implementar notificacao de ticket no Telegram.
- Implementar logout automatico configuravel.
- Configurar manifest PWA e responsividade mobile.

## P2

- Adicionar rollback de credenciais.
- Adicionar importacao/exportacao CSV no modulo de senhas.
- Adicionar favicon automatico.
- Criar modulo de TimeSheet.
- Criar timer ativo com notificacao PWA.
- Criar VisitEntry.
- Criar regras de apuracao financeira interna.
- Criar telas de auditoria mais detalhadas.

## P3

- Criar portal financeiro do cliente.
- Anexar boleto e nota fiscal.
- Criar lembretes recorrentes de pagamento.
- Criar relatorios executivos.
- Refinar seguranca e compliance.

## Backlog de UX

- Definir mapa de navegacao.
- Definir design system leve.
- Padronizar cards dos modulos.
- Padronizar telas de formulario.
- Padronizar estados vazios, erro e carregamento.
- Definir template HTML de email.
- Definir template visual de notificacao Telegram.

## Backlog de Infra

- Definir estrategia de storage para anexos.
- Definir provider de deploy.
- Definir variaveis secretas e rotacao de chaves.
- Definir politica de backup do PostgreSQL.
- Definir observabilidade e retencao de logs.

## Pendencias Antes de Codar Tudo

- Fechar modelo exato de storage de anexos.
- Fechar regra exata de onboarding do usuario convidado.
- Fechar calculo financeiro com exemplos reais.
- Fechar layout final do dashboard e dos modulos.
- Fechar politica de criptografia e rotacao de chaves.

## Ordem Recomendada de Implementacao

1. Base de autenticacao, empresa, usuario e permissoes.
2. Onboarding do primeiro `SUPER_ADMIN`.
3. Dashboard dinamico.
4. Auditoria central.
5. Tickets.
6. Senhas.
7. Timesheet.
8. Financeiro.
9. Refinamentos de PWA, notificacoes e relatorios.
