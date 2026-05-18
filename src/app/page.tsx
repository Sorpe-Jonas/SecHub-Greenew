import Image from "next/image";
import Link from "next/link";

const serviceList = [
  {
    icon: "/window.svg",
    alt: "Servidor",
    title: "Manutenção de servidores",
    description: "Atualizações, hardening e recuperação com arquitetura preparada para alta disponibilidade.",
  },
  {
    icon: "/globe.svg",
    alt: "Conexão remota",
    title: "Suporte local e remoto",
    description: "Resolução rápida on-site e atendimento remoto com SLA transparente.",
  },
  {
    icon: "/sechub-logo.svg",
    alt: "Ativos",
    title: "Gestão de ativos",
    description: "Controle de hardware, software, contratos e ciclo de vida em uma única plataforma.",
  },
  {
    icon: "/file.svg",
    alt: "Tickets",
    title: "Atendimento de chamados",
    description: "Fluxo claro de incidentes com priorização, histórico e SLA acionável.",
  },
  {
    icon: "/globe.svg",
    alt: "Segurança",
    title: "Segurança e compliance",
    description: "Proteção de dados, auditorias e políticas de segurança estruturadas.",
  },
  {
    icon: "/window.svg",
    alt: "Consultoria",
    title: "Consultoria estratégica",
    description: "Planejamento de TI que alinha tecnologia, custos e crescimento do negócio.",
  },
];

const partnerLogos = [
  { src: "/sechub-logo.svg", alt: "SecHub" },
  { src: "/next.svg", alt: "Next.js" },
  { src: "/vercel.svg", alt: "Vercel" },
];

export default function Home() {
  return (
    <main className="pageShell landingShell">
      <header className="landingHeader">
        <div className="brandHomeLink brandStatic" aria-label="SecHub">
          <span className="brandMark" aria-hidden="true">
            S
          </span>
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

      <section className="landingHero">
        <div className="landingHeroContent">
          <span className="eyebrow">Plataforma de TI corporativa</span>
          <h1>Gestão de TI e suporte de infraestrutura com entrega empresarial.</h1>
          <p>
            Segurança, atendimento e resolução de incidentes em um portal único. Ideal para empresas que precisam de TI confiável, escalável e transparente.
          </p>

          <div className="heroActions">
            <Link className="primaryButton" href="/login">
              Entrar no portal
            </Link>
            <Link className="secondaryButton" href="#servicos">
              Ver serviços
            </Link>
          </div>

          <div className="heroBadges">
            <div>
              <strong>24/7</strong>
              <span>Suporte contínuo</span>
            </div>
            <div>
              <strong>+350</strong>
              <span>Ativos sob gestão</span>
            </div>
            <div>
              <strong>99,9%</strong>
              <span>Disponibilidade</span>
            </div>
          </div>

          <div className="heroPartnerLogos">
            <span>Clientes que confiam na operação e governança de TI</span>
            <div className="brandRow">
              {partnerLogos.map((logo) => (
                <div key={logo.alt} className="trustedLogo">
                  <Image src={logo.src} alt={logo.alt} width={88} height={28} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="landingHeroVisual">
          <div className="visualFrame">
            <Image src="/window.svg" alt="Painel de serviços de TI" width={560} height={420} priority />
            <div className="visualLabel topLeft">
              <Image src="/globe.svg" alt="Rede global" width={24} height={24} />
              <span>Monitoramento ativo</span>
            </div>
            <div className="visualLabel bottomRight">
              <Image src="/file.svg" alt="Relatórios" width={24} height={24} />
              <span>Relatórios de SLA</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landingSection" id="servicos">
        <div className="sectionHeader">
          <span className="eyebrow">Nossos serviços</span>
          <h2>TI end-to-end para operações mais seguras e eficientes.</h2>
        </div>

        <div className="serviceGrid">
          {serviceList.map((service) => (
            <div key={service.title} className="serviceCard">
              <div className="serviceIcon">
                <Image src={service.icon} alt={service.alt} width={28} height={28} />
              </div>
              <strong>{service.title}</strong>
              <p>{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landingSection landingWhy" id="vantagens">
        <div className="sectionHeader">
          <span className="eyebrow">O que entregamos</span>
          <h2>Operação de TI com governança, segurança e controle máximo.</h2>
        </div>

        <div className="valuesGrid">
          <div className="valueCard">
            <strong>Visibilidade total</strong>
            <p>Centralize chamados, ativos e desempenho em dashboards claros para decisão rápida.</p>
          </div>
          <div className="valueCard">
            <strong>Segurança de ponta</strong>
            <p>Implementamos controles, políticas e registros que mantêm sua operação alinhada às melhores práticas.</p>
          </div>
          <div className="valueCard">
            <strong>Suporte dedicado</strong>
            <p>Equipe preparada para atendimento rápido e continuidade, com compromissos de SLA reais.</p>
          </div>
        </div>
      </section>

      <section className="trustedBy">
        <span className="eyebrow">Parcerias</span>
        <h2>Plataforma criada para empresas e times que buscam estabilidade.</h2>
        <div className="trustedLogos">
          {partnerLogos.map((logo) => (
            <div key={logo.alt} className="trustedLogoCard">
              <Image src={logo.src} alt={logo.alt} width={100} height={32} />
            </div>
          ))}
        </div>
      </section>

      <section className="landingCta">
        <div>
          <span className="eyebrow">Comece agora</span>
          <h2>Leve sua TI para um novo patamar com uma plataforma corporativa.</h2>
          <p>Faça login no portal e comece a identificar riscos, reduzir custos e melhorar o suporte imediatamente.</p>
        </div>
        <Link className="secondaryButton" href="/login">
          Entrar no portal
        </Link>
      </section>
    </main>
  );
}
