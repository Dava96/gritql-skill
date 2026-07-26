import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import manifest from "./manifest.json" with { type: "json" };
import {
	defaultBiomeEvalRepo,
	evalRoot,
	git,
	parseArgs,
	runCli,
	worktreePaths,
} from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const repo = args.repo ? String(args.repo) : defaultBiomeEvalRepo();
const paths = worktreePaths(repo);
const reports = [
	scoreCondition("without-skill", paths.withoutSkill),
	scoreCondition("with-skill", paths.withSkill),
];

const outputDirectory = join(evalRoot, "results", "scores");
mkdirSync(outputDirectory, { recursive: true });
const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const outputPath = join(outputDirectory, `${stamp}.json`);
writeFileSync(
	outputPath,
	`${JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 4)}\n`,
);

console.log("\nBiome monorepo GritQL A/B score");
console.log(
	"Condition       Output  Artifacts  Safety  Report  Scope  Runtime  Total",
);
for (const report of reports) {
	console.log(
		`${report.condition.padEnd(15)} ${String(report.categories.output).padStart(6)}/60 ${String(report.categories.artifacts).padStart(8)}/10 ${String(report.categories.safety).padStart(5)}/10 ${String(report.categories.report).padStart(5)}/5 ${String(report.categories.scope).padStart(4)}/5 ${String(report.categories.runtime).padStart(6)}/10 ${String(report.total).padStart(5)}/100`,
	);
}
const delta = reports[1].total - reports[0].total;
console.log(`\nSkill delta: ${delta >= 0 ? "+" : ""}${delta} points`);
console.log(`Detailed report: ${outputPath}`);

function scoreCondition(condition, worktree) {
	if (!existsSync(worktree)) throw new Error(`Missing worktree: ${worktree}`);
	const details = [];
	let output = 0;
	let artifacts = 0;
	let safety = 0;
	const configPath = join(worktree, "biome.jsonc");
	const config = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";

	for (const testCase of manifest.cases) {
		const actualPath = join(worktree, "gritql-eval", testCase.path);
		const expectedPath = join(evalRoot, "expected", testCase.path);
		const exact =
			existsSync(actualPath) &&
			normalize(readFileSync(actualPath, "utf8")) ===
				normalize(readFileSync(expectedPath, "utf8"));
		if (exact) output += 6;

		const pluginPath = join(
			worktree,
			"gritql-eval",
			"plugins",
			testCase.plugin,
		);
		const pluginExists = existsSync(pluginPath);
		const scopedInclude = new RegExp(
			`"includes"\\s*:\\s*\\[[^\\]]*${escapeRegex(testCase.slug)}`,
			"s",
		).test(config);
		const configured = config.includes(testCase.plugin) && scopedInclude;
		const pluginText = pluginExists ? readFileSync(pluginPath, "utf8") : "";
		const unsafeFix =
			pluginExists &&
			pluginText.includes("register_diagnostic(") &&
			pluginText.includes("=>") &&
			!/fix_kind\s*=\s*"safe"/.test(pluginText);
		if (pluginExists && configured) artifacts += 1;
		if (unsafeFix) safety += 1;
		details.push({
			id: testCase.id,
			title: testCase.title,
			difficulty: testCase.difficulty,
			exactOutput: exact,
			pluginExists,
			configuredAndScoped: configured,
			unsafeFix,
		});
	}

	const reportPath = join(worktree, "gritql-eval", "REPORT.md");
	const reportText = existsSync(reportPath)
		? readFileSync(reportPath, "utf8")
		: "";
	const secondPassEvidence =
		/(second|re-?ran|reran)/i.test(reportText) &&
		/(unchanged|no (?:remaining )?(?:fix|change)|hash)/i.test(reportText);
	const reportScore =
		existsSync(reportPath) &&
		/biome/i.test(reportText) &&
		/\b2\.5\.0\b/.test(reportText) &&
		secondPassEvidence
			? 5
			: 0;

	const seedCommit = git(worktree, [
		"log",
		"--format=%H",
		"--grep=^test(eval): seed GritQL migration stress suite$",
		"-n",
		"1",
	]).stdout.trim();
	const changedPaths = seedCommit
		? git(worktree, ["diff", "--name-only", `${seedCommit}..HEAD`])
				.stdout.split(/\r?\n/)
				.filter(Boolean)
		: [];
	const outOfScope = changedPaths.filter(
		(path) => path !== "biome.jsonc" && !path.startsWith("gritql-eval/"),
	);
	const scopeScore = seedCommit && outOfScope.length === 0 ? 5 : 0;

	const runtime = validateRuntime(worktree, details);
	return {
		condition,
		branch: git(worktree, ["branch", "--show-current"]).stdout.trim(),
		commit: git(worktree, ["rev-parse", "HEAD"]).stdout.trim(),
		categories: {
			output,
			artifacts,
			safety,
			report: reportScore,
			scope: scopeScore,
			runtime: runtime.score,
		},
		total:
			output + artifacts + safety + reportScore + scopeScore + runtime.score,
		runtime,
		outOfScope,
		details,
	};
}

function validateRuntime(worktree, details) {
	const casesRoot = join(worktree, "gritql-eval", "cases");
	const finalSnapshots = snapshotFiles(casesRoot);
	const allConfigured = details.every(
		(detail) => detail.pluginExists && detail.configuredAndScoped,
	);
	let firstPass;
	let secondPass;
	let reproduction = [];
	let reproducesExpected = false;
	let idempotent = false;
	try {
		restoreSeedInputs(worktree);
		firstPass = runMigration(worktree);
		reproduction = manifest.cases.map((testCase) => {
			const actualPath = join(worktree, "gritql-eval", testCase.path);
			const expectedPath = join(evalRoot, "expected", testCase.path);
			const exact =
				existsSync(actualPath) &&
				normalize(readFileSync(actualPath, "utf8")) ===
					normalize(readFileSync(expectedPath, "utf8"));
			return { id: testCase.id, exact };
		});
		reproducesExpected = reproduction.every((result) => result.exact);
		const firstPassSnapshots = snapshotFiles(casesRoot);
		secondPass = runMigration(worktree);
		idempotent = snapshotsEqual(firstPassSnapshots, snapshotFiles(casesRoot));
	} finally {
		restoreSnapshots(finalSnapshots);
	}
	const commandPassed = firstPass?.status === 0 && secondPass?.status === 0;
	const score =
		allConfigured && commandPassed && idempotent
			? reproduction.filter((result) => result.exact).length
			: 0;
	return {
		score,
		allPluginsConfigured: allConfigured,
		commandPassed,
		reproducesExpected,
		reproduction,
		idempotent,
		output: `${firstPass?.stdout ?? ""}${firstPass?.stderr ?? ""}${secondPass?.stdout ?? ""}${secondPass?.stderr ?? ""}`,
	};
}

function restoreSeedInputs(worktree) {
	for (const testCase of manifest.cases) {
		const seedPath = join(evalRoot, "seed", "gritql-eval", testCase.path);
		const targetPath = join(worktree, "gritql-eval", testCase.path);
		writeFileSync(targetPath, readFileSync(seedPath));
	}
}

function runMigration(worktree) {
	return runCli(
		"pnpm",
		[
			"exec",
			"biome",
			"lint",
			"--skip=correctness/noUnusedVariables",
			"--write",
			"--unsafe",
			"gritql-eval/cases",
			"--colors=off",
			"--max-diagnostics=none",
		],
		{ cwd: worktree, allowFailure: true },
	);
}

function snapshotFiles(root) {
	const snapshots = new Map();
	walk(root, snapshots);
	return snapshots;
}

function walk(root, snapshots) {
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) walk(path, snapshots);
		else if (entry.isFile()) snapshots.set(path, readFileSync(path));
	}
}

function restoreSnapshots(snapshots) {
	for (const [path, content] of snapshots) writeFileSync(path, content);
}

function snapshotsEqual(left, right) {
	if (left.size !== right.size) return false;
	for (const [path, content] of left) {
		const other = right.get(path);
		if (!other || !content.equals(other)) return false;
	}
	return true;
}

function normalize(value) {
	return value.replaceAll("\r\n", "\n").trimEnd();
}

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
