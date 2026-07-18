// docs-site/src/pack-examples.ts — every example here is run through the REAL `validatePack`
// (packages/packs/src/validate.ts) in docs-site/test/pack-examples.test.ts: a `valid: true` entry
// must not throw, a `valid: false` entry must throw. Keeps the pack-format reference page from
// drifting away from what a pack.json actually has to look like.

export interface PackExample {
  title: string;
  json: unknown;
  valid: boolean;
  note: string;
}

export const packExamples: PackExample[] = [
  {
    title: "Minimal valid pack",
    valid: true,
    note:
      "The smallest object validatePack accepts: id (a lowercase slug), version, title, summary, " +
      "context.markdown, and the three required arrays — agents, commands, hooks — which may all be " +
      "empty. Every other field (attribution, scope, capabilities, skills, onboarding, relatedTo, " +
      "supersedes) is optional.",
    json: {
      id: "hello-pack",
      version: "1.0.0",
      title: "Hello Pack",
      summary: "A minimal example pack with no blocks.",
      context: { markdown: "## Hello\n\nThis pack ships no agents, commands, or hooks.\n" },
      agents: [],
      commands: [],
      hooks: [],
    },
  },
  {
    title: "Pack with a skill",
    valid: true,
    note:
      "`skills[i]` requires name (slug, ≤ 64 chars), description (single line, ≤ 1024 chars, no " +
      "XML tags), body (markdown, ≤ 500 lines), and category (slug). Governance fields " +
      "(userInvocable/disableModelInvocation/allowedTools) are optional and render as kebab-case " +
      "SKILL.md frontmatter keys.",
    json: {
      id: "example-skill-pack",
      version: "1.0.0",
      title: "Example Skill Pack",
      summary: "Ships one skill.",
      context: { markdown: "## Example skill pack\n" },
      skills: [
        {
          name: "greeting",
          description: "Greets the user politely.",
          body: "# Greeting\n\nSay hello.\n",
          category: "utility",
        },
      ],
      agents: [],
      commands: [],
      hooks: [],
    },
  },
  {
    title: "Pack with an agent, a command, and a hook",
    valid: true,
    note:
      "agents[i] needs name/description/tools/model/prompt. commands[i] needs " +
      "name/description/argument_hint/prompt. hooks[i] needs event (one of the fixed Claude Code " +
      "lifecycle events), matcher (may be empty), description, action (\"print-reminder\" or " +
      "\"run-command\"), and message or command depending on the action.",
    json: {
      id: "full-block-pack",
      version: "1.0.0",
      title: "Full Block Pack",
      summary: "One of each block type.",
      context: { markdown: "## Full block pack\n" },
      agents: [
        {
          name: "reviewer",
          description: "Reviews changes for correctness.",
          tools: ["Read", "Grep"],
          model: "sonnet",
          prompt: "You review diffs for correctness.",
        },
      ],
      commands: [
        {
          name: "review",
          description: "Run a review pass.",
          argument_hint: "[scope]",
          prompt: "Review $ARGUMENTS.",
        },
      ],
      hooks: [
        {
          event: "SessionStart",
          matcher: "",
          description: "Remind to read docs at session start.",
          action: "print-reminder",
          message: "Read AGENTS.md before acting.",
        },
      ],
    },
  },
  {
    title: "Pack with a capability",
    valid: true,
    note:
      "capabilities[i] needs type (one of memory/tasks/wiki/graph/design/system-map), store " +
      "(\"org\" or \"repo\"), and method (a slug, optionally +-joined for a modifier like " +
      "\"analyze+llm\"). At most one memory capability per store may use method \"files\" or " +
      "\"native\" (they'd both own /remember), and at most one design capability per store.",
    json: {
      id: "capability-pack",
      version: "1.0.0",
      title: "Capability Pack",
      summary: "Declares a wiki capability.",
      context: { markdown: "## Capability pack\n" },
      capabilities: [{ type: "wiki", store: "repo", method: "baselane" }],
      agents: [],
      commands: [],
      hooks: [],
    },
  },
  {
    title: "Pack with scope, attribution, and onboarding",
    valid: true,
    note:
      "scope is \"repo\" (default), \"developer\", or \"both\". attribution (source/url/license) " +
      "credits an imported pack's origin. onboarding[i] needs a unique id, title, description, and " +
      "an optional command shown (never executed) to the developer post-install.",
    json: {
      id: "attributed-pack",
      version: "2.1.0",
      title: "Attributed Pack",
      summary: "Imported from an external skills repo, with an onboarding step.",
      context: { markdown: "## Attributed pack\n" },
      scope: "both",
      attribution: { source: "example/skills-repo", url: "https://github.com/example/skills-repo", license: "MIT" },
      onboarding: [
        { id: "first-run", title: "Run the CLI once", description: "Confirm the pack installed cleanly.", command: "baselane drift" },
      ],
      agents: [],
      commands: [],
      hooks: [],
    },
  },
  {
    title: "INVALID — id is not a lowercase slug",
    valid: false,
    note:
      "`id` must match a lowercase slug pattern (letters, digits, dashes, starting with a letter or " +
      "digit) — validatePack rejects capitals, spaces, or underscores outright.",
    json: {
      id: "Not A Slug!",
      version: "1.0.0",
      title: "Bad Id Pack",
      summary: "id is not a valid slug.",
      context: { markdown: "## Bad id\n" },
      agents: [],
      commands: [],
      hooks: [],
    },
  },
];
