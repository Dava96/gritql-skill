import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs, workspacePaths } from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const paths = workspacePaths(
	args.root ? resolve(String(args.root)) : undefined,
);
for (const workspace of Object.values(paths)) {
	if (!existsSync(workspace)) continue;
	rmSync(workspace, { recursive: true, force: true });
	console.log(`Removed ${workspace}`);
}
