# Melhorias e Sugestoes

## Objetivo

Alinhar o escopo funcional do portal principal antes da implementacao, definindo prioridades, papeis, blocos iniciais e sugestoes de produto.

## Diretrizes Gerais

- O site sera PWA.
- O sistema deve ser 100% responsivo e compativel com mobile.
- O portal sera multiempresa.
- Cada empresa tera seus dados isolados em tickets, senhas, horas e financeiro.
- O Admin Total podera ver tudo consolidado ou filtrado por empresa.
- Novas empresas serao criadas pelo Admin Total.
- Cada empresa tera seu proprio Admin e seus proprios Users.
- O primeiro acesso da plataforma deve criar o Admin Total caso o banco esteja vazio.
- O sistema tera logout automatico configuravel pelo Admin Total.
- Integracoes sensiveis como Auth0, SMTP e Telegram ficarao apenas com Admin Total.

## Perfis de Acesso

### Admin Total

- Gerencia a plataforma inteira.
- Cria empresas.
- Cria e gerencia usuarios.
- Define niveis de acesso.
- Configura Auth0.
- Configura SMTP.
- Configura bot do Telegram.
- Define regras de sessao e logout automatico.
- Acessa logs e auditoria.
- Visualiza dados de todas as empresas.
- Gerencia blocos e permissoes por empresa.
- Configura parametros financeiros e operacionais.

### Admin

- Gerencia usuarios da propria empresa.
- Define quais blocos cada usuario da empresa pode ver.
- Acompanha tickets da propria empresa.
- Pode cadastrar novos usuarios.
- Pode operar modulos autorizados da empresa.
- Pode responder tickets da propria empresa.

### User

- Acessa apenas os blocos liberados.
- Abre e acompanha os proprios tickets.
- Usa os modulos disponibilizados.

## Prioridades

## P1

Escopo minimo para lancamento funcional da plataforma.

- Estrutura PWA.
- Multiempresa com isolamento de dados.
- Fluxo de primeiro acesso para criacao do Admin Total.
- Login com Auth0 e email/senha.
- Controle de perfil: Admin Total, Admin e User.
- Dashboard com cards dinamicos por permissao.
- Modulo de Senhas com CRUD basico, compartilhamento por empresa e auditoria.
- Modulo de Tickets com abertura, acompanhamento e status.
- Convite e criacao de usuarios por email.
- Configuracao de SMTP.
- Configuracao de Telegram para envio de chamados.
- Auditoria basica do sistema.
- Logout automatico configuravel.

## P2

Escopo importante para consolidacao operacional.

- Rollback de senhas com historico de ate 20 versoes por credencial.
- Importacao e exportacao de senhas com controle por perfil.
- Visualizacao segura de senha com auditoria detalhada.
- Favicons automaticos nas credenciais.
- Timesheet integrado com ticket.
- Registro de visitas presenciais.
- Parametros de cobranca por hora e por visita.
- Resumo financeiro interno.
- Notificacoes automaticas por email para clientes.
- Dashboard consolidado por empresa e geral.
- Cronometro de atendimento com inicio e parada.
- Notificacao PWA com timer rodando no celular.

## P3

Escopo avancado e refinamentos.

- Resumo financeiro detalhado para cliente.
- Anexos de boleto e nota fiscal com notificacoes recorrentes.
- Automacao de lembretes ate marcacao de pagamento.
- Filtros e visoes executivas avancadas.
- Melhorias de UX, analytics e relatorios.
- Regras avancadas de seguranca e compliance.

## Blocos do Portal

- Senhas
- Ticket / Suporte
- Grafana
- TimeSheet
- Financeiro

## Recomendacao de Ordem de Construcao

1. Base da plataforma: autenticacao, multiempresa, perfis, PWA e dashboard.
2. Senhas.
3. Ticket / Suporte.
4. Timesheet.
5. Financeiro.
6. Refinamentos, auditoria avancada e automacoes.

## Bloco: Senhas

## Objetivo

Criar um cofre corporativo semelhante a um Keepass web, compartilhado por empresa e com forte rastreabilidade.

## Funcionalidades Principais

- Listar credenciais por empresa.
- Criar credencial.
- Editar credencial.
- Remover credencial.
- Compartilhar acesso entre usuarios da mesma empresa.
- Visualizar senha com log.
- Copiar senha com log.
- Copiar usuario com log.
- Salvar URL associada.
- Gerar senha automatica com parametros definidos pelo usuario.
- Importar credenciais por CSV.
- Exportar credenciais por CSV apenas para Admin e Admin Total.
- Exibir favicon automaticamente pela URL.

## Auditoria Obrigatoria

- Quem visualizou senha.
- Quem copiou senha.
- Quem copiou usuario.
- Quem criou.
- Quem editou.
- Quem removeu.
- IP de origem.
- Data e hora.
- Empresa.

## Rollback

- Cada credencial deve manter ate 20 versoes historicas.
- Apenas Admin e Admin Total podem restaurar versoes.
- O restore deve registrar auditoria.

## Sugestoes de Melhoria

- Tags por sistema, ambiente ou cliente.
- Campos customizaveis por credencial.
- Favoritos.
- Busca rapida.
- Indicador de forca da senha.
- Alerta de senha antiga.
- Cofre separado por categoria.
- Permissao de leitura sem edicao.

## Requisitos de Seguranca

- Criptografia forte para dados sensiveis em repouso.
- Mascaramento por padrao.
- Confirmacao adicional para exportacao.
- Sessao expira automaticamente.
- Logs imutaveis para auditoria.

## Bloco: Ticket / Suporte

## Objetivo

Criar um sistema proprio de chamados, simples para o usuario e eficiente para triagem operacional.

## Regras de Visibilidade

- User ve apenas os proprios tickets.
- Admin ve tickets da propria empresa.
- Admin Total ve tickets de todas as empresas.
- Admin e Admin Total respondem tickets.
- Quando User responder ticket, Telegram notifica novamente.
- Quando Admin ou Admin Total responderem ticket, o User recebe email.

## Status Basicos

- Aberto
- Em triagem
- Em atendimento
- Aguardando usuario
- Resolvido
- Fechado
- Cancelado

## Card Inicial para Novo Ticket

- Pessoal
- Computador
- Infraestrutura
- Outros Problemas

## Fluxo Sugerido

1. Usuario clica em "Abrir novo ticket".
2. Escolhe um card principal.
3. Escolhe um subcard.
4. Sistema preenche parte do formulario automaticamente.
5. Usuario detalha o problema.
6. Usuario pode anexar imagem.
7. Ticket e criado com nome, email, horario e empresa.
8. Chamado pode ser enviado tambem ao Telegram.

## Subcards Sugeridos

### Pessoal

- Reset de senha da conta
- Problema com email corporativo
- Reset de senha do email
- Reset de senha da maquina
- Acesso bloqueado
- MFA / autenticacao
- Permissao de sistema
- Problema com assinatura de email
- Problema com espaço na caixa postal
- Solicitacao de novo acesso

### Computador

- Problema de hardware
- Lentidao
- Instalacao de aplicativo
- Erro em software
- Upgrade de memoria
- Upgrade de armazenamento
- Troca de equipamento
- Problema com impressora
- Webcam / audio / microfone
- Formatação / reinstalacao

### Infraestrutura

- Problema de rede
- Wi-Fi
- VPN
- Servidor indisponivel
- Acesso remoto
- Falha de DNS
- Compartilhamento de arquivos
- Firewall / bloqueio
- Link instavel
- Queda de servico

### Outros Problemas

- Formulario livre com:
- Titulo
- Descricao
- Categoria sugerida
- Prioridade
- Anexo de imagem

## Sugestoes de UX

- Cards grandes e objetivos.
- Cada subcard deve abrir com descricao curta do tipo de problema.
- Formulario final ja vem com campos pre-preenchidos.
- Exemplo: categoria, subcategoria, urgencia e sugestao de titulo.
- Timeline visivel no ticket.
- Etiquetas de status e prioridade.
- Comentarios internos apenas para equipe.

## Melhorias Operacionais

- Encaminhamento do resumo do chamado para Telegram.
- Historico de status.
- SLA por categoria.
- Filtros por empresa, status, categoria e tecnico.
- Base futura para integracao com timesheet.
- Template HTML para emails do sistema.
- Mensagem formatada e legivel no Telegram.

## Campos Minimos do Ticket

- Nome do solicitante
- Email
- Empresa
- Categoria
- Subcategoria
- Titulo
- Descricao
- Prioridade
- Status
- Data e hora de abertura
- Anexos

## Bloco: TimeSheet

## Objetivo

Registrar horas trabalhadas, atendimentos e visitas presenciais, com apoio ao faturamento.

## Regras

- Visivel apenas para Admin Total.
- Pode associar hora a ticket de forma opcional.
- Deve registrar cliente, empresa, tipo de atendimento e observacao.
- Deve calcular franquia inicial de horas.
- Deve calcular horas excedentes.
- Deve calcular valor por visita presencial.
- Horas podem ser editadas manualmente depois.

## Funcionalidades

- Lancamento manual de horas.
- Associacao opcional a ticket.
- Botao "Iniciar atendimento" para iniciar o contador em tempo real.
- Botao para encerrar o atendimento e gravar o tempo.
- Exibicao do tempo em andamento.
- Notificacao no celular enquanto o timer estiver rodando.
- Registro de atendimento presencial.
- Parametros de valor por hora.
- Parametros de franquia minima.
- Parametros de valor por visita.
- Resumo mensal.
- Resumo por empresa.
- Indicador de quanto sera recebido.

## Sugestoes

- Relogio de inicio e fim alem de lancamento manual.
- Templates de atividade.
- Aprovacao interna de lancamentos.
- Exportacao para relatorio mensal.

## Bloco: Financeiro

## Objetivo

Dar visibilidade ao cliente sobre horas, cobrancas e documentos disponiveis.

## Regras

- Cliente visualiza resumo da propria empresa.
- Admin e Admin Total podem cadastrar emails para envio automatico.
- Boleto e nota fiscal serao gerados fora da plataforma, mas anexados nela.

## Funcionalidades

- Resumo das horas do periodo.
- Resumo de visitas presenciais.
- Valor acumulado.
- Solicitacao de documentos.
- Download de anexos liberados.
- Aviso por email quando boleto ou nota forem anexados.
- Lembretes recorrentes ate marcacao de pagamento.
- Marcacao manual de pagamento por Admin Total.

## Sugestoes

- Timeline financeira por competencia.
- Historico de envio de emails.
- Dashboard simples para cliente.
- Filtro por periodo.

## Bloco: Grafana

## Objetivo

Ser um ponto de acesso rapido aos paineis externos de observabilidade.

## Sugestoes

- Card externo com configuracao por empresa ou global.
- Permissao por perfil.
- Possibilidade futura de embed controlado, se fizer sentido.

## Configuracoes Globais do Sistema

Visivel apenas para Admin Total.

- Auth0
- SMTP
- Telegram
- Empresas
- Parametros de sessao
- Auditoria
- Parametros financeiros
- Blocos ativos por empresa

## Melhorias Estruturais Recomendadas

- Estruturar tudo por empresa desde o inicio.
- Tratar auditoria como modulo central e nao detalhe posterior.
- Adotar permissoes por role e por bloco.
- Separar configuracoes globais de configuracoes por empresa.
- Definir desde cedo matriz de permissoes.
- Definir eventos auditaveis obrigatorios por modulo.
- Criar onboarding do primeiro admin no deploy inicial.
- Padronizar convites por email para novos usuarios.

## Sugestao de Cards do Dashboard Inicial

- Senhas
- Tickets / Suporte
- Grafana
- TimeSheet
- Financeiro
- Empresas
- Configuracoes
- Auditoria

## Sugestao de Cards por Perfil

### User

- Senhas
- Tickets / Suporte
- Grafana

### Admin

- Senhas
- Tickets / Suporte
- Grafana
- Usuarios
- Blocos

### Admin Total

- Senhas
- Tickets / Suporte
- Grafana
- TimeSheet
- Financeiro
- Empresas
- Auditoria
- Configuracoes

## Pontos que Precisam Ficar Fechados Antes do Desenvolvimento

- Modelo exato de multiempresa.
  Regra definida: apenas o Admin Total cria empresas.
  Cada empresa e independente em tickets, senhas, horas e financeiro.
  Cada empresa tera seu proprio Admin e seus proprios Users.

- Regra de convite e criacao de usuarios.
  Admin e Admin Total podem criar usuarios dentro da empresa.
  O usuario recebera um email com convite ou acesso inicial.

- Matriz de permissao por perfil e por bloco.
  Admin e Admin Total podem definir quais blocos cada usuario pode acessar.
  Exemplo: apenas Tickets e Financeiro, ou apenas Senhas.

- Estrategia de criptografia do modulo de senhas.
  Precisa ser detalhada tecnicamente antes da implementacao.

- Escopo minimo do ticketing para o P1.
  Definicao sugerida:
  abertura de ticket por card e subcard, status basicos, comentarios, anexo de imagem, historico, filtro por perfil, envio para Telegram e email de resposta ao usuario.

- Regras financeiras exatas: franquia, excedente e visita.
  Definicao sugerida:
  quantidade de horas inclusas no contrato, valor da hora excedente, valor por visita presencial, periodicidade de apuracao e regras de arredondamento.

- Formato dos emails e mensagens do Telegram.
  Emails serao em HTML com template padrao da plataforma.
  O Telegram recebera um resumo bem formatado do ticket.
  Quando o User responder o ticket, o Telegram notifica novamente.
  Quando Admin ou Admin Total responderem, o sistema envia email ao usuario que abriu.

## Regras Ja Fechadas a Partir Deste Documento

- O sistema e multiempresa com isolamento de dados por empresa.
- Apenas o Admin Total cria novas empresas.
- Cada empresa tem seu proprio Admin e seus proprios Users.
- Admin e Admin Total criam usuarios e enviam acesso por email.
- Admin e Admin Total podem liberar blocos especificos por usuario.
- O timesheet tera cronometro de atendimento com notificacao PWA no celular.
- Registros de horas poderao ser editados manualmente depois.
- Ticket novo ou resposta do User notifica no Telegram.
- Resposta de Admin ou Admin Total notifica o User por email.

## Conclusao

O melhor caminho e iniciar por uma base solida com multiempresa, autenticacao, permissoes, auditoria e dashboard dinamico. Depois disso, os blocos devem entrar por ordem de impacto operacional: Senhas, Tickets, TimeSheet e Financeiro.
