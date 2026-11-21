#!/usr/bin/env python3
import argparse
import glob
import json
import os
import platform
import re
import sys

TEMPLATES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "templates")
CAPS = {"repo facts": 4000, "attempt notes": 8000, "recheck": 6000}
CRITERION = r"^- \[[ xX]\]\s+(.*)"
STEP = r"^\d+\.\s+(.*)"


def die(message):
    sys.exit("compile: " + message)


def slot(path, kind):
    if not os.path.isfile(path):
        die(f"{path} does not exist")
    text = open(path, encoding="utf-8").read().strip()
    size = len(text.encode("utf-8"))
    if size > CAPS[kind]:
        die(f"{path} is {size} bytes; the {kind} slot holds {CAPS[kind]}. "
            "Cut it back to what the slot is for.")
    return text


def keep_blocks(text, flags):
    def choose(match):
        kind, name, body = match.group(1), match.group(2), match.group(3)
        return body if (name in flags) == (kind == "only") else ""
    return re.sub(r"<!-- (only|unless):(\w+) -->\n(.*?)<!-- end:\2 -->\n", choose, text, flags=re.S)


def fill(text, values):
    def value(match):
        key = match.group(1)
        if key not in values:
            die(f"the template asks for {{{{{key}}}}} and nothing fills it")
        return values[key]
    return re.sub(r"\{\{([A-Z_]+)\}\}", value, text)


def section(ticket, name):
    match = re.search(rf"^## {re.escape(name)}\n(.*?)(?=^## |\Z)", ticket, re.S | re.M)
    if not match:
        die(f"the ticket has no '## {name}' section")
    return match.group(1).strip()


def items(block, pattern):
    found = []
    for line in block.splitlines():
        match = re.match(pattern, line)
        if match:
            found.append(match.group(1).strip())
        elif found and line.strip() and line[0] in " \t":
            found[-1] += " " + line.strip()
    return found


def label(prefix, number, text):
    text = re.sub(r"\s+", " ", text).replace("|", "/")
    return f"{prefix}{number}: {text if len(text) <= 70 else text[:70].rstrip() + '…'}"


def rows(ticket, manifest, only):
    table = []
    criteria = items(section(ticket, "Acceptance criteria"), CRITERION)
    if not criteria:
        die("no '- [ ]' lines under Acceptance criteria")
    for number, text in enumerate(criteria, 1):
        table.append((f"AC{number}", label("AC", number, text), "", ""))
    for number, text in enumerate(items(section(ticket, "How to test as the user"), STEP), 1):
        manual = text.lower().startswith("manual:")
        table.append((f"S{number}", label("S", number, text),
                      "deferred" if manual else "", "the Operator's" if manual else ""))
    always = []
    if manifest["check_command"] != "none":
        always.append(("Check", "Check", "", ""))
    if manifest["test_command"] != "none":
        always.append(("Suite", "Suite", "", ""))
    if only:
        known = [row[0] for row in table + always]
        unknown = [row for row in only if row not in known]
        if unknown:
            die(f"no such rows: {', '.join(unknown)} (this ticket has {', '.join(known)})")
        table = [row for row in table if row[0] in only]
    return "\n".join(" ".join(f"| {name} | {state} | | {evidence} |".split()) for _, name, state, evidence in table + always)


def main():
    parser = argparse.ArgumentParser(description="Compile a Foreman brief from its template.")
    parser.add_argument("run_dir", help="<target>/.foreman/runs/<run-id>")
    parser.add_argument("kind", choices=["builder", "verifier", "review"])
    parser.add_argument("ticket", nargs="?", help="ticket number, e.g. 03 (builder and verifier)")
    parser.add_argument("--attempt", default="1", help="builder: attempt number")
    parser.add_argument("--notes", help="builder, attempt 2 and up: file with the failing verdict rows "
                        "or builder errors verbatim, or the tree state after a kept Halt")
    parser.add_argument("--suffix", default="", help="verifier: file suffix for this round, e.g. .r2")
    parser.add_argument("--rows", help="verifier recheck: comma-separated row ids still open, e.g. AC2,S1")
    parser.add_argument("--recheck", help="verifier recheck: file with those rows and their evidence, "
                        "plus the last verdict's 'Your fix' or 'Suggested fix', verbatim")
    parser.add_argument("--no-fix", action="store_true", help="verifier: judge only")
    args = parser.parse_args()

    run = os.path.abspath(args.run_dir)
    target = os.path.dirname(os.path.dirname(os.path.dirname(run)))
    relative = os.path.relpath(run, target)
    manifest = json.load(open(os.path.join(run, "manifest.json"), encoding="utf-8"))
    for field in ("feature", "base_commit", "run_branch", "check_command", "test_command", "end_of_run_tests"):
        if not manifest.get(field):
            die(f"manifest.json has no {field}")

    facts_path = os.path.join(run, "repo-facts.md")
    facts = slot(facts_path, "repo facts") if os.path.isfile(facts_path) else ""
    values = {
        "FEATURE": manifest["feature"],
        "RUN_ID": manifest.get("run_id", os.path.basename(run)),
        "BASE_COMMIT": manifest["base_commit"],
        "RUN_BRANCH": manifest["run_branch"],
        "SPEC_PATH": manifest.get("spec_file") or "none",
        "CHECK_COMMAND": manifest["check_command"],
        "TEST_COMMAND": manifest["test_command"],
        "END_OF_RUN_TESTS": manifest["end_of_run_tests"],
        "REPO_FACTS_SECTION": f"## Repo facts\n\n{facts}\n" if facts else "",
        "SKILLS_DIR": os.path.abspath(os.path.join(TEMPLATES, "..", "..")),
    }
    flags = set()
    if platform.system() == "Windows" or sys.platform in ("cygwin", "msys"):
        flags.add("windows")

    if args.kind == "review":
        values["REVIEW_PATH"] = f"{relative}/review.md"
        out = "review.brief.md"
    else:
        if not args.ticket:
            die(f"{args.kind} needs a ticket number")
        found = glob.glob(os.path.join(target, ".scratch", manifest["feature"], "issues", f"{args.ticket}-*.md"))
        if len(found) != 1:
            die(f"expected one ticket file for {args.ticket}, found {len(found)}")
        ticket = open(found[0], encoding="utf-8").read()
        title = ticket.splitlines()[0].split(":", 1)[-1].strip()
        values.update({"N": args.ticket, "TITLE": title})

        if args.kind == "builder":
            tdd = re.search(r"\*\*TDD:\*\*\s*(\w+)", ticket)
            if not tdd:
                die("the ticket has no TDD line")
            if tdd.group(1).lower() == "yes":
                flags.add("tdd")
            stem = f"ticket-{args.ticket}" if args.attempt == "1" else f"ticket-{args.ticket}.attempt-{args.attempt}"
            notes = slot(args.notes, "attempt notes") if args.notes else ""
            values.update({
                "ATTEMPT": args.attempt,
                "TICKET": ticket.strip(),
                "ATTEMPT_NOTES_SECTION": f"## This attempt\n\n{notes}\n" if notes else "",
                "RESULT_PATH": f"{relative}/{stem}.result.md",
            })
            out = f"{stem}.brief.md"
        else:
            if bool(args.rows) != bool(args.recheck):
                die("--rows and --recheck go together")
            if args.recheck:
                flags.add("recheck")
            if not args.no_fix:
                flags.add("fix")
            only = [row.strip() for row in args.rows.split(",")] if args.rows else None
            values.update({
                "ACCEPTANCE_CRITERIA": section(ticket, "Acceptance criteria"),
                "HOW_TO_TEST": section(ticket, "How to test as the user"),
                "TICKET_PATH": os.path.relpath(found[0], target),
                "RECHECK": slot(args.recheck, "recheck") if args.recheck else "",
                "ROWS": rows(ticket, manifest, only),
                "VERDICT_PATH": f"{relative}/ticket-{args.ticket}.verdict{args.suffix}.md",
            })
            out = f"ticket-{args.ticket}.verifier{args.suffix}.brief.md"

    template = {"builder": "builder-brief.md", "verifier": "verifier-brief.md", "review": "review-brief.md"}[args.kind]
    brief = fill(keep_blocks(open(os.path.join(TEMPLATES, template), encoding="utf-8").read(), flags), values)
    brief = re.sub(r"\n{3,}", "\n\n", brief)
    path = os.path.join(run, out)
    open(path, "w", encoding="utf-8").write(brief)
    print(path)


if __name__ == "__main__":
    main()
