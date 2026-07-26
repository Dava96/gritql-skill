import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import manifest from "./manifest.json" with { type: "json" };
import {
	git,
	normalize,
	parseArgs,
	runGrit,
	standaloneRoot,
	workspacePaths,
} from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const paths = workspacePaths(
	args.root ? resolve(String(args.root)) : undefined,
);
const reports = [
	scoreCondition("without-skill", paths.withoutSkill),
	scoreCondition("with-skill", paths.withSkill),
];
const outputDirectory = join(standaloneRoot, "results", "scores");
mkdirSync(outputDirectory, { recursive: true });
const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const outputPath = join(outputDirectory, `${stamp}.json`);
writeFileSync(
	outputPath,
	`${JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 4)}\n`,
);

console.log("\nStandalone GritQL A/B score");
console.log(
	"Condition       Output  Patterns  Tests  Runtime  Report  Scope  Total",
);
for (const report of reports) {
	const c = report.categories;
	console.log(
		`${report.condition.padEnd(15)} ${String(c.output).padStart(6)}/40 ${String(c.patterns).padStart(8)}/8 ${String(c.tests).padStart(5)}/8 ${String(c.runtime).padStart(7)}/32 ${String(c.report).padStart(5)}/6 ${String(c.scope).padStart(4)}/6 ${String(report.total).padStart(5)}/100`,
	);
}
const delta = reports[1].total - reports[0].total;
console.log(`\nSkill delta: ${delta >= 0 ? "+" : ""}${delta} points`);
console.log(`Detailed report: ${outputPath}`);

function scoreCondition(condition, workspace) {
	if (!existsSync(workspace))
		throw new Error(`Missing workspace: ${workspace}`);
	let output = 0;
	let patterns = 0;
	let tests = 0;
	let runtime = 0;
	const details = [];

	for (const testCase of manifest.cases) {
		const actualPath = join(workspace, testCase.path);
		const expectedPath = join(standaloneRoot, "expected", testCase.path);
		const exactOutput =
			existsSync(actualPath) &&
			normalize(readFileSync(actualPath, "utf8")) ===
				normalize(readFileSync(expectedPath, "utf8"));
		if (exactOutput) output += 5;
		const patternPath = join(workspace, ".grit", "patterns", testCase.pattern);
		const patternExists = existsSync(patternPath);
		const patternText = patternExists ? readFileSync(patternPath, "utf8") : "";
		const languageDeclared =
			patternExists &&
			patternText.includes("```grit") &&
			/\blanguage\s+[a-z]+/.test(patternText);
		if (languageDeclared) patterns += 1;
		const test = patternExists
			? runGrit(workspace, ["patterns", "test", `--filter=${testCase.name}`], {
					allowFailure: true,
				})
			: null;
		const testsPassed =
			test?.status === 0 && /Found 1 testable patterns/i.test(test.stdout);
		if (testsPassed) tests += 1;
		const replay = validateReplay(workspace, testCase, patternExists);
		runtime +=
			(replay.exact ? 2 : 0) +
			(replay.generalizes ? 1 : 0) +
			(replay.idempotent ? 1 : 0);
		details.push({
			id: testCase.id,
			title: testCase.title,
			exactOutput,
			patternExists,
			languageDeclared,
			testsPassed,
			testOutput: test ? `${test.stdout}${test.stderr}` : "",
			replay,
		});
	}

	const reportPath = join(workspace, "REPORT.md");
	const report = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
	const reportChecks = {
		exists: Boolean(report),
		version: /\b0\.1\.1\b/.test(report),
		tests: /patterns test/i.test(report),
		apply: /grit apply/i.test(report),
		replay: /(replay|original input|fresh input)/i.test(report),
		idempotence: /(second pass|idempot)/i.test(report),
	};
	const reportScore = Object.values(reportChecks).filter(Boolean).length;

	const seed = git(workspace, [
		"log",
		"--format=%H",
		"--grep=^test(eval): seed standalone GritQL stress suite$",
		"-n",
		"1",
	]).stdout.trim();
	const changed = git(workspace, ["diff", "--name-only", `${seed}..HEAD`])
		.stdout.split(/\r?\n/)
		.filter(Boolean);
	const outOfScope = changed.filter(
		(path) =>
			path !== "REPORT.md" &&
			!path.startsWith("cases/") &&
			!path.startsWith(".grit/patterns/"),
	);
	const scope = seed && outOfScope.length === 0 ? 6 : 0;
	return {
		condition,
		branch: git(workspace, ["branch", "--show-current"]).stdout.trim(),
		commit: git(workspace, ["rev-parse", "HEAD"]).stdout.trim(),
		categories: {
			output,
			patterns,
			tests,
			runtime,
			report: reportScore,
			scope,
		},
		total: output + patterns + tests + runtime + reportScore + scope,
		reportChecks,
		outOfScope,
		details,
	};
}

function validateReplay(workspace, testCase, runnable) {
	if (!runnable) {
		return {
			commandPassed: false,
			exact: false,
			generalizes: false,
			idempotent: false,
		};
	}
	const actualPath = join(workspace, testCase.path);
	const seedPath = join(
		standaloneRoot,
		"seed",
		"gritql-standalone-eval",
		testCase.path,
	);
	const expectedPath = join(standaloneRoot, "expected", testCase.path);
	const hiddenRelative = join(".grit-hidden-score", testCase.path);
	const hiddenPath = join(workspace, hiddenRelative);
	const hiddenInput = join(standaloneRoot, "hidden", "input", testCase.path);
	const hiddenExpected = join(
		standaloneRoot,
		"hidden",
		"expected",
		testCase.path,
	);
	const final = readFileSync(actualPath, "utf8");
	let first;
	let second;
	let hidden;
	let exact = false;
	let generalizes = false;
	let idempotent = false;
	try {
		writeFileSync(actualPath, readFileSync(seedPath));
		first = runGrit(
			workspace,
			["apply", testCase.name, testCase.path, "--force", "--output", "none"],
			{ allowFailure: true },
		);
		const afterFirst = readFileSync(actualPath, "utf8");
		exact =
			first.status === 0 &&
			normalize(afterFirst) === normalize(readFileSync(expectedPath, "utf8"));
		second = runGrit(
			workspace,
			["apply", testCase.name, testCase.path, "--force", "--output", "none"],
			{ allowFailure: true },
		);
		idempotent =
			second.status === 0 && readFileSync(actualPath, "utf8") === afterFirst;
		mkdirSync(dirname(hiddenPath), { recursive: true });
		writeFileSync(hiddenPath, readFileSync(hiddenInput));
		hidden = runGrit(
			workspace,
			["apply", testCase.name, hiddenRelative, "--force", "--output", "none"],
			{ allowFailure: true },
		);
		generalizes =
			hidden.status === 0 &&
			normalize(readFileSync(hiddenPath, "utf8")) ===
				normalize(readFileSync(hiddenExpected, "utf8"));
	} finally {
		writeFileSync(actualPath, final);
		rmSync(join(workspace, ".grit-hidden-score"), {
			recursive: true,
			force: true,
		});
	}
	return {
		commandPassed:
			first?.status === 0 && second?.status === 0 && hidden?.status === 0,
		exact,
		generalizes,
		idempotent,
		output: `${first?.stdout ?? ""}${first?.stderr ?? ""}${second?.stdout ?? ""}${second?.stderr ?? ""}${hidden?.stdout ?? ""}${hidden?.stderr ?? ""}`,
	};
}
