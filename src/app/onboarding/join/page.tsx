import { JoinWizard } from "@/components/onboarding/join-wizard";

export const metadata = { title: "Join a set" };

export default function JoinPage() {
  return (
    <div>
      <h1 className="t-h1">Find your set</h1>
      <p className="t-lead mb-9 mt-2.5 max-w-xl">
        Search the directory, pick the year you left, and tell your classmates who you were.
      </p>
      <JoinWizard mode="join" />
    </div>
  );
}

// Personalised to the signed-in user — never prerender at build time.
export const dynamic = "force-dynamic";
