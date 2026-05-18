import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SetupPanel } from "@/components/auth/setup-panel";
import { isBootstrapRequired } from "@/lib/bootstrap";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const bootstrapRequired = await isBootstrapRequired();
  const auth0Enabled = Boolean(
    process.env.AUTH_AUTH0_ID &&
      process.env.AUTH_AUTH0_SECRET &&
      process.env.AUTH_AUTH0_ISSUER,
  );

  return (
    <main className="pageShell">
      {bootstrapRequired ? <SetupPanel /> : <AuthPanel auth0Enabled={auth0Enabled} />}
    </main>
  );
}
