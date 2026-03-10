import { InvitationStatus } from "@prisma/client";

import { InvitationAcceptForm } from "@/components/admin/invitation-accept-form";
import { prisma } from "@/lib/prisma";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: {
      company: true,
    },
  });

  if (!invitation || invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
    return (
      <main className="pageShell">
        <section className="supportPanel">
          <h2>Convite invalido</h2>
          <p className="helperText">Este convite nao existe, ja foi utilizado ou expirou.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="pageShell">
      <InvitationAcceptForm
        token={invitation.token}
        email={invitation.email}
        companyName={invitation.company.name}
      />
    </main>
  );
}
