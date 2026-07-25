import Link from "next/link";

const serviceList = [
  {
    icon: "🖥️",
    alt: "Servidor",
    title: "Manutenção de servidores",
    description:
      "Atualizações, hardening e recuperação com arquitetura preparada para alta disponibilidade.",
    accent: "var(--cyan)",
  },
  {
    icon: "🌐",
    alt: "Conexão remota",
    title: "Suporte local e remoto",
    description:
      "Resolução rápida on-site e atendimento remoto com SLA transparente.",
    accent: "var(--mint)",
  },
  {
    icon: "📊",
    alt: "Ativos",
    title: "Gestão de ativos",
    description:
      "Controle de hardware, software, contratos e ciclo de vida em uma única plataforma.",
    accent: "var(--amber)",
  },
  {
    icon: "🎫",
    alt: "Tickets",
    title: "Atendimento de chamados",
    description:
      "Fluxo claro de incidentes com priorização, histórico e SLA acionável.",
    accent: "#f472b6",
  },
  {
    icon: "🔒",
    alt: "Segurança",
    title: "Segurança e compliance",
    description:
      "Proteção de dados, auditorias e políticas de segurança estruturadas.",
    accent: "#a78bfa",
  },
  {
    icon: "💡",
    alt: "Consultoria",
    title: "Consultoria estratégica",
    description:
      "Planejamento de TI que alinha tecnologia, custos e crescimento do negócio.",
    accent: "#fb923c",
  },
];

const stats = [
  { value: "24/7", label: "Suporte contínuo" },
  { value: "+350", label: "Ativos sob gestão" },
  { value: "99,9%", label: "Disponibilidade" },
  { value: "< 15min", label: "Tempo médio de resposta" },
];

const values = [
  {
    icon: "👁️",
    title: "Visibilidade total",
    desc: "Centralize chamados, ativos e desempenho em dashboards claros para decisão rápida.",
  },
  {
    icon: "🛡️",
    title: "Segurança de ponta",
    desc: "Implementamos controles, políticas e registros que mantêm sua operação alinhada às melhores práticas.",
  },
  {
    icon: "⚡",
    title: "Suporte dedicado",
    desc: "Equipe preparada para atendimento rápido e continuidade, com compromissos de SLA reais.",
  },
];

export default function Home() {
  return (
    <div className="landing-wrapper">
      {/* Decorative background elements */}
      <div className="bg-glow bg-glow--top-left" />
      <div className="bg-glow bg-glow--bottom-right" />
      <div className="bg-grid" />

      <main className="pageShell landingContainer">
        {/* ── Header ── */}
        <header className="landingHeader">
          <div className="brandHomeLink brandStatic" aria-label="SecHub">
            <span className="brandMark" aria-hidden="true">S</span>
            <span className="brandWordmark">sechub</span>
          </div>
          <nav className="landingNav">
            <Link href="#servicos">Serviços</Link>
            <Link href="#vantagens">Vantagens</Link>
            <Link className="loginHeaderButton" href="/login">
              Entrar
            </Link>
          </nav>
        </header>

        {/* ── Hero ── */}
        <section className="landingHero">
          <div className="landingHeroContent">
            <span className="eyebrow">Plataforma de TI corporativa</span>
            <h1>
              Gestão de TI e{" "}
              <span className="text-gradient">suporte de infraestrutura</span>{" "}
              com entrega empresarial.
            </h1>
            <p>
              Segurança, atendimento e resolução de incidentes em um portal
              único. Ideal para empresas que precisam de TI confiável,
              escalável e transparente.
            </p>

            <div className="heroActions">
              <Link className="primaryButton glow-button" href="/login">
                Entrar no portal
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link className="secondaryButton" href="#servicos">
                Ver serviços
              </Link>
            </div>

            <div className="heroBadges">
              {stats.map((stat) => (
                <div key={stat.label} className="badge-card">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landingHeroVisual">
            <div className="hero-floating-card hero-floating-card--1">
              <div className="floating-dot" />
              <span>Monitoramento ativo</span>
            </div>

            <div className="hero-main-card">
              <div className="hero-card-glow" />
              <div className="hero-card-content">
                <div className="hero-card-header">
                  <div className="hero-card-dots">
                    <span /><span /><span />
                  </div>
                  <span className="hero-card-title">Painel de Serviços</span>
                </div>
                <div className="hero-card-body">
                  <div className="mini-chart">
                    <div className="mini-chart-bar" style={{ height: "70%" }} />
                    <div className="mini-chart-bar" style={{ height: "45%" }} />
                    <div className="mini-chart-bar" style={{ height: "88%" }} />
                    <div className="mini-chart-bar" style={{ height: "60%" }} />
                    <div className="mini-chart-bar" style={{ height: "95%" }} />
                    <div className="mini-chart-bar" style={{ height: "40%" }} />
                    <div className="mini-chart-bar" style={{ height: "75%" }} />
                  </div>
                  <div className="mini-stats">
                    <div className="mini-stat">
                      <span className="mini-stat-value">98%</span>
                      <span className="mini-stat-label">SLA</span>
                    </div>
                    <div className="mini-stat">
                      <span className="mini-stat-value">12</span>
                      <span className="mini-stat-label">Ativos</span>
                    </div>
                    <div className="mini-stat">
                      <span className="mini-stat-value">3</span>
                      <span className="mini-stat-label">Abertos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-floating-card hero-floating-card--2">
              <div className="floating-dot floating-dot--green" />
              <span>Relatórios de SLA</span>
            </div>
          </div>
        </section>

        {/* ── Serviços ── */}
        <section className="landingSection" id="servicos">
          <div className="sectionHeader">
            <span className="eyebrow">Nossos serviços</span>
            <h2>
              TI end-to-end para operações mais{" "}
              <span className="text-gradient">seguras e eficientes</span>.
            </h2>
          </div>

          <div className="serviceGrid">
            {serviceList.map((service) => (
              <div
                key={service.title}
                className="serviceCard"
                style={{ "--card-accent": service.accent } as React.CSSProperties}
              >
                <div className="serviceIcon">{service.icon}</div>
                <strong>{service.title}</strong>
                <p>{service.description}</p>
                <div className="serviceCardGlow" />
              </div>
            ))}
          </div>
        </section>

        {/* ── Valores ── */}
        <section className="landingSection landingValues" id="vantagens">
          <div className="sectionHeader">
            <span className="eyebrow">O que entregamos</span>
            <h2>
              Operação de TI com{" "}
              <span className="text-gradient">governança, segurança e controle</span>.
            </h2>
          </div>

          <div className="valuesGrid">
            {values.map((v) => (
              <div key={v.title} className="valueCard">
                <div className="valueIcon">{v.icon}</div>
                <strong>{v.title}</strong>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="landingCta">
          <div>
            <span className="eyebrow">Comece agora</span>
            <h2>Leve sua TI para um novo patamar com uma plataforma corporativa.</h2>
            <p>
              Faça login no portal e comece a identificar riscos, reduzir custos
              e melhorar o suporte imediatamente.
            </p>
          </div>
          <Link className="primaryButton cta-button" href="/login">
            Entrar no portal
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </section>
      </main>
    </div>
  );
}