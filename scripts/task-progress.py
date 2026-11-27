"""Rebuilds the progress view in docs/TASKS.md from its checkboxes.

Run after ticking subtasks:   python scripts/task-progress.py
When a step is finished, raise FINISHED_STEP below.
"""
import os
import re

FINISHED_STEP = 11

STEPS = [
    ("Remove template content", ["FND-1"]),
    ("Project structure and database", ["FND-2", "FND-3", "DB-1", "DB-2"]),
    ("Sign-in and permissions", ["AUTH-1", "AUTH-2", "AUTH-3"]),
    ("User management and sample data", ["USR-1", "USR-2", "DB-3"]),
    ("Question bank", ["QB-1", "QB-2", "QB-3"]),
    ("Examinations and enrolment", ["EXM-1", "EXM-2", "EXM-3", "ENR-1", "ENR-2", "ENR-3"]),
    ("Attempt engine and server timing", ["ATT-1", "ATT-2", "ATT-3", "ATT-4"]),
    ("Exam screen: autosave, resume, submit", ["WS-1", "WS-2", "WS-3", "WS-4"]),
    ("Grading and results", ["GRD-1", "GRD-2", "GRD-3", "RES-1", "RES-2", "RES-3", "RES-4"]),
    ("Monitoring and announcements", ["MON-1", "MON-2", "MON-3", "MON-4"]),
    ("Network status, sandbox, scratchpad, preferences", ["NET-1", "SBX-1", "SBX-2", "PAD-1", "PREF-1"]),
    ("Bulk import and question analytics", ["IMP-1", "IMP-2", "QAN-1"]),
    ("PDF reports and verification", ["PDF-1", "PDF-2", "VER-1", "VER-2"]),
    ("Innovation: fair randomized papers", ["FAIR-1", "FAIR-2", "FAIR-3"]),
    ("Security and reliability pass", ["SEC-1", "SEC-2", "SEC-3", "REL-1", "REL-2", "REL-3"]),
    ("Testing, hosting, submission", ["TST-1", "TST-2", "SHIP-1", "SHIP-2", "SHIP-3", "SHIP-4"]),
]
# What each step is for, in priority order after the foundation
KIND = {9: "Core", 10: "Core", 11: "Secondary", 12: "Secondary", 13: "Secondary", 14: "Innovation",
        15: "Core quality", 16: "Submission"}
STEP_OF = {task: number for number, (_, tasks) in enumerate(STEPS, 1) for task in tasks}
START, END = "<!-- progress:start -->", "<!-- progress:end -->"
HEADING = re.compile(r"^### ([A-Z]+-\d+) (.*)$")

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "TASKS.md")
text = open(path, encoding="utf8").read()
if START in text:
    text = text[: text.index(START)] + text[text.index(END) + len(END):].lstrip("\n")
lines = text.split("\n")

# ---------- read every task and its subtasks ----------
tasks, current = {}, None
for index, line in enumerate(lines):
    match = HEADING.match(line)
    if match:
        current = match.group(1)
        tasks[current] = {"line": index, "rest": match.group(2), "done": [], "open": [], "extra": []}
    elif line.startswith("## ") or line.startswith("### ") or line.strip() == "---":
        current = None
    elif current and (item := re.match(r"^- \[([ x])\] (.*)$", line)):
        done, label = item.group(1) == "x", item.group(2)
        if label.startswith("★") and not done:
            tasks[current]["extra"].append(label)
        else:
            tasks[current]["done" if done else "open"].append(label)

missing = sorted(set(tasks) ^ set(STEP_OF))
assert not missing, f"Tasks and steps disagree: {missing}"


def status(task):
    if not task["open"] and task["done"]:
        return "✅ Done"
    return "🟡 Partly done" if task["done"] else "⬜ Not started"


# ---------- tag every heading ----------
for task_id, task in tasks.items():
    parts = re.split(r" · | — ", task["rest"])
    keep = [parts[0]] + [p for p in parts[1:] if re.fullmatch(r"P\d|[SML]", p)]
    lines[task["line"]] = f"### {task_id} {' · '.join(keep)} — {status(task)} (step {STEP_OF[task_id]})"

# ---------- build the overview ----------
done_count = sum(len(t["done"]) for t in tasks.values())
total = done_count + sum(len(t["open"]) for t in tasks.values())
next_step = FINISHED_STEP + 1
out = [START, "## Progress", ""]
out.append(
    f"**Steps finished: {FINISHED_STEP} of {len(STEPS)}** · required subtasks ticked: {done_count} of {total} · "
    + (f"**next: step {next_step}, {STEPS[next_step - 1][0]}**" if next_step <= len(STEPS) else "**all steps finished**")
)
out += ["", "| Step | Work | Kind | Tasks | Subtasks | Status |", "|---:|---|---|---|---:|---|"]
for number, (title, ids) in enumerate(STEPS, 1):
    done = sum(len(tasks[i]["done"]) for i in ids)
    size = done + sum(len(tasks[i]["open"]) for i in ids)
    if number <= FINISHED_STEP:
        label = "✅ Done" if done == size else f"✅ Done ({size - done} carried over)"
    elif number == next_step:
        label = "▶️ Next"
    else:
        label = "🟡 Started early" if done else "⬜ Not started"
    out.append(f"| {number} | {title} | {KIND.get(number, 'Foundation')} | {', '.join(ids)} | {done}/{size} | {label} |")

carried = [(i, t) for i, t in tasks.items() if STEP_OF[i] <= FINISHED_STEP and t["open"]]
out += ["", "### Carried over from finished steps", ""]
out += [f"- **{i}** (step {STEP_OF[i]}): {label}" for i, t in carried for label in t["open"]] or ["- Nothing"]
early = [(i, t) for i, t in tasks.items() if STEP_OF[i] > FINISHED_STEP and t["done"]]
if early:
    out += ["", "### Already done ahead of its step", ""]
    out += [f"- **{i}** (step {STEP_OF[i]}): {label}" for i, t in early for label in t["done"]]
out += ["", "Steps are the working order: core features first, then the simpler secondary features, then the rest.",
        "★ extras come only after all required work. Detailed subtasks are below, grouped by feature.", "", END, ""]

# the overview goes right after the title and introduction
anchor = next(i for i, line in enumerate(lines) if line.startswith("## "))
lines[anchor:anchor] = out
open(path, "w", encoding="utf8", newline="\n").write("\n".join(lines))
print(f"{done_count}/{total} required subtasks ticked, {FINISHED_STEP} steps finished")
