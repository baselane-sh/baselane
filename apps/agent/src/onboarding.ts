import type { BundleOnboardingStep } from "@baselane/materialize";

/** Renders the pending onboarding steps as a printable checklist. Automatic execution of a step's
 * command is NOT implemented this increment — each command is shown for the developer to run, and the
 * auto-run capability is labeled "coming soon" (honesty rule). Empty for no steps. */
export function formatOnboarding(steps: BundleOnboardingStep[]): string {
  if (steps.length === 0) return "";
  const lines = ["", "Onboarding — recommended steps (auto-run: coming soon, run these yourself for now):"];
  for (const s of steps) {
    lines.push(`  [ ] ${s.title} — ${s.description}`);
    if (s.command) lines.push(`      $ ${s.command}`);
  }
  return lines.join("\n");
}
