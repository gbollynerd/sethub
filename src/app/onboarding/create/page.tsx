import { JoinWizard } from "@/components/onboarding/join-wizard";

export const metadata = { title: "Create a set" };

export default function CreateSetPage() {
  return (
    <div>
      <h1 className="t-h1">Create your set</h1>
      <p className="t-lead mb-9 mt-2.5 max-w-xl">
        Pick your school and graduating year. We will set up #general, the EXCO positions, the
        standard administrative roles and a finance ledger automatically.
      </p>
      <JoinWizard mode="create" />
    </div>
  );
}

// Personalised to the signed-in user — never prerender at build time.
export const dynamic = "force-dynamic";
