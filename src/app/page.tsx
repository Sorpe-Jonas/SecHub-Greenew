import Image from "next/image";
import Link from "next/link";

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
        <Link className="loginHeaderButton" href="/login">
          Entrar
        </Link>
      </header>

      <section className="landingHero">
        <div className="landingHeroContent">
          <span className="eyebrow">Suporte de TI para empresas</span>
          <h1>Infraestrutura, atendimento e gestão de TI que movimentam o seu negócio.</h1>
          <p>
            Transforme sua operação com serviço de TI profissional: atendimento de chamados com SLA, suporte local e remoto, manutenção de servidores e gestão de ativos.
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
              <span>Disponibilidade garantida</span>
            </div>
          </div>
        </div>

        <div className="landingHeroVisual">
          <div className="visualFrame">
            <Image src="/window.svg" alt="Painel de serviços de TI" width={560} height={420} priority />
            <div className="visualLabel topLeft">
              <Image src="/globe.svg" alt="Rede global" width={24} height={24} />
              <span>Monitoramento global</span>
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
          <h2>Especialistas em TI completa: do servidor ao atendimento.</h2>
        </div>

        <div className="serviceGrid">
          <div className="serviceCard">
            <div className="serviceIcon">
              <Image src="/window.svg" alt="Servidor" width={28} height={28} />
            </div>
            <strong>Manutenção de servidores</strong>
            <p>Suporte técnico, atualizações, hardening e recuperação de servidores.</p>
          </div>
          <div className="serviceCard">
            <div className="serviceIcon">
              <Image src="/globe.svg" alt="Conexão remota" width={28} height={28} />
            </div>
            <strong>Suporte local e remoto</strong>
            <p>Assistência rápida on-site ou por acesso remoto para reduzir tempo de parada.</p>
          </div>
          <div className="serviceCard">
            <div className="serviceIcon">
              <Image src="/sechub-logo.svg" alt="Ativos" width={28} height={28} />
            </div>
            <strong>Gerenciamento de ativos</strong>
            <p>Controle completo de hardware e software, ciclo de vida e inventário.</p>
          </div>
          <div className="serviceCard">
            <div className="serviceIcon">
              <Image src="/file.svg" alt="Tickets" width={28} height={28} />
            </div>
            <strong>Atendimento de chamados</strong>
            <p>Processo claro com SLA, priorização e solução de incidentes.</p>
          </div>
          <div className="serviceCard">
            <div className="serviceIcon">
              <Image src="/globe.svg" alt="Segurança" width={28} height={28} />
            </div>
            <strong>Segurança e compliance</strong>
            <p>Proteção de dados e ambiente com políticas de segurança aplicadas.</p>
          </div>
          <div className="serviceCard">
            <div className="serviceIcon">
              <Image src="/window.svg" alt="Consultoria" width={28} height={28} />
            </div>
            <strong>Consultoria e planejamento</strong>
            <p>Estratégia de TI alinhada ao crescimento e à eficiência do negócio.</p>
          </div>
        </div>
      </section>

      <section className="landingCta">
        <div>
          <span className="eyebrow">Comece hoje</span>
          <h2>Tenha um parceiro de TI pronto para escalar com você.</h2>
          <p>Fale com nossa equipe, conheça nossos planos e deixe a gestão de TI nas mãos de especialistas.</p>
        </div>
        <Link className="secondaryButton" href="/login">
          Conectar à área de clientes
        </Link>
      </section>
    </main>
  );
}
