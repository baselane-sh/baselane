// Thin process entry for the agent CLI — all logic (and all testing) lives in
// cli.ts's main(); this file only binds it to argv/exit-code side effects.
import { main } from "./cli.ts";

process.exit(await main(process.argv.slice(2)));
