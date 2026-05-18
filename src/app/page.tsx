import Link from "next/link";

export default function Home() {
  return (
    <main className="pageShell landingShell">
      <section className="landingHero">
        <div>
          <span className="eyebrow">Serviços de TI</span>
          <h1>Infraestrutura, suporte e gestão de TI para sua empresa.</h1>
          <p>
            Soluções completas em manutenção de servidores e computadores, gerenciamento de ativos, suporte remoto e local, atendimento de chamados e monitoramento de SLA.
          </p>
          <div className="heroActions">
            <Link className="primaryButton" href="/login">
              Acessar área do cliente
            </Link>
          </div>
        </div>

        <div className="landingStats">
          <div>
            <strong>24/7</strong>
            <span>Suporte local e remoto</span>
          </div>
          <div>
            <strong>+300</strong>
            <span>Ativos gerenciados</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>SLA de atendimento</span>
          </div>
        </div>
      </section>

      <section className="landingSection">
        <div className="sectionHeader">
          <span className="eyebrow">O que fazemos</span>
          <h2>Serviços pensados para aumentar disponibilidade e reduzir custos.</h2>
        </div>

        <div className="featureGrid">
          <div className="featureCard">
            <strong>Manutenção de servidores</strong>
            <span>Instalação, configuração e hardening de servidores físicos e virtuais.</span>
          </div>
          <div className="featureCard">
            <strong>Suporte local e remoto</strong>
            <span>Atendimento ágil para resolver problemas no escritório ou via conexão segura.</span>
          </div>
          <div className="featureCard">
            <strong>Gerenciamento de ativos</strong>
            <span>Inventário e ciclo de vida de hardware e software para controle total do parque.</span>
          </div>
          <div className="featureCard">
            <strong>Atendimento de chamados</strong>
            <span>Processo estruturado de SLA para priorizar e acompanhar todas as demandas.</span>
          </div>
          <div className="featureCard">
            <strong>Segurança operacional</strong>
            <span>Monitoramento e ajustes que mantêm seu ambiente protegido e disponível.</span>
          </div>
          <div className="featureCard">
            <strong>Consultoria em TI</strong>
            <span>Análises e recomendações para alinhar tecnologia e objetivos de negócio.</span>
          </div>
        </div>
      </section>

      <section className="landingCta">
        <div>
          <h2>Pronto para modernizar seu TI?</h2>
          <p>Agende uma conversa e descubra como reduzir riscos, aumentar performance e melhorar a experiência do usuário.</p>
        </div>
        <Link className="secondaryButton" href="/login">
          Acessar sistema / Login
        </Link>
      </section>
    </main>
  );
}
