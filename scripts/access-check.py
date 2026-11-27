"""Access-control check against the local Docker app (run: python scripts/access-check.py).

Needs the demo accounts in docs/TEST-ACCOUNTS.md. Changes some account flags and restores them.
Never prints passwords or tokens. Local test database only.
"""
import http.cookiejar
import json
import os
import re
import subprocess
import urllib.error
import urllib.request

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
BASE = "http://localhost:3000"
accounts = {
    role: (email, password)
    for role, email, password in re.findall(r"\| (\w+) \| `([^`]+)` \| `([^`]+)` \|", open("docs/TEST-ACCOUNTS.md", encoding="utf8").read())
}
results = []


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def client():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar), NoRedirect), jar


def call(c, method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json", **(headers or {})})
    try:
        r = c[0].open(req, timeout=120)
        return r.status, r.headers.get("location"), r.read().decode("utf8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("location"), e.read().decode("utf8", "replace")


def check(name, ok, detail=""):
    results.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  -> {detail}"))


def sql(statement):
    subprocess.run(["docker", "compose", "-f", "docker-compose.dev.yml", "exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "secureexam", "-qc", statement], check=True, capture_output=True)


def login(role, password=None):
    c = client()
    email, pw = accounts[role]
    status, _, body = call(c, "POST", "/api/auth/login", {"email": email, "password": password or pw})
    return c, status, body


def goes_to(c, path, target):
    status, location, body = call(c, "GET", path)
    ok = (location or "").endswith(target) or f"NEXT_REDIRECT;replace;{target}" in body or f'url={target}"' in body
    return ok, f"{status} {location}"


anon = client()
for method, path, body in [
    ("GET", "/api/admin/users", None), ("GET", "/api/admin/audit-logs", None), ("GET", "/api/admin/support", None),
    ("GET", "/api/chat/messages", None), ("GET", "/api/notifications", None), ("GET", "/api/support", None),
    ("POST", "/api/speech", {"text": "hi"}), ("POST", "/api/get-or-create-room", {}), ("POST", "/api/check-room", {"room_id": "x"}),
    ("POST", "/api/generate-code", {"room_id": "x"}), ("POST", "/api/email/send", {}), ("POST", "/api/stripe/create-checkout", {}),
]:
    status, _, _ = call(anon, method, path, body)
    check(f"anonymous refused {method} {path}", status in (401, 403), status)
for page in ["/admin", "/examiner", "/candidate", "/profile", "/admin/users", "/send-email"]:
    ok, detail = goes_to(anon, page, "/login")
    check(f"anonymous page {page} goes to /login", ok, detail)
status, _, _ = call(anon, "POST", "/api/auth/signup", {"email": "x@secureexam.test", "password": "Abcdefgh1"})
check("public sign-up is closed", status == 403, status)
status, _, _ = call(anon, "GET", "/api/admin/users", headers={"Cookie": "auth-token=eyJhbGciOiJIUzI1NiJ9.eyJzdiI6MSwic3ViIjoiMSJ9.forged"})
check("forged session refused", status in (401, 403), status)

sessions = {}
for role, home in [("Administrator", "/admin"), ("Examiner", "/examiner"), ("Candidate", "/candidate")]:
    c, status, body = login(role)
    check(f"{role} signs in", status == 200, f"{status} {body[:120]}")
    sessions[role] = c
    ok, detail = goes_to(c, "/", home)
    check(f"{role} home is {home}", ok, detail)
    status, _, body = call(c, "GET", home)
    check(f"{role} dashboard renders", status == 200 and "NEXT_REDIRECT" not in body, status)
    status, _, body = call(c, "GET", "/api/auth/me")
    check(f"{role} response has no password hash", "passwordHash" not in body, "leak")

admin, examiner, candidate = sessions["Administrator"], sessions["Examiner"], sessions["Candidate"]
check("admin lists users", call(admin, "GET", "/api/admin/users")[0] == 200)
check("admin reads audit log", call(admin, "GET", "/api/admin/audit-logs")[0] == 200)
for who, c in [("examiner", examiner), ("candidate", candidate)]:
    for path in ["/api/admin/users", "/api/admin/audit-logs"]:
        status = call(c, "GET", path)[0]
        check(f"{who} refused {path}", status in (401, 403), status)
    for page in ["/admin", "/admin/users", "/send-email"]:
        ok, detail = goes_to(c, page, "/")
        check(f"{who} kept out of {page}", ok, detail)
check("candidate refused staff support", call(candidate, "GET", "/api/admin/support")[0] in (401, 403))
check("candidate cannot create rooms", call(candidate, "POST", "/api/get-or-create-room", {})[0] == 401)
ok, detail = goes_to(candidate, "/examiner", "/")
check("candidate kept out of /examiner", ok, detail)
status = call(candidate, "PATCH", "/api/auth/me", {"name": "Demo Candidate", "role": "ADMIN"})[0]
check("role cannot be set from the client", status == 400, status)

# disabled account loses its session at once
email = accounts["Examiner"][0]
sql(f"UPDATE \"User\" SET status='DISABLED' WHERE email='{email}'")
check("disabled account session ends", call(examiner, "GET", "/api/auth/me")[0] == 401)
check("disabled account cannot sign in", login("Examiner")[1] == 401)
sql(f"UPDATE \"User\" SET status='ACTIVE' WHERE email='{email}'")

# temporary password flow and session revocation
email, original = accounts["Candidate"]
sql(f"UPDATE \"User\" SET \"mustChangePassword\"=true WHERE email='{email}'")
first, status, body = login("Candidate")
check("temporary password signs in with change flag", status == 200 and '"mustChangePassword":true' in body, status)
status = call(first, "GET", "/api/notifications")[0]
check("other APIs blocked until password changed", status == 401, status)
ok, detail = goes_to(first, "/candidate", "/change-password")
check("pages redirect to change password", ok, detail)
second, _, _ = login("Candidate")
temp = "Temp-Check-9431x"
status, _, body = call(first, "POST", "/api/auth/password", {"currentPassword": original, "newPassword": temp})
check("password change succeeds", status == 200, f"{status} {body[:150]}")
check("changing session stays signed in", call(first, "GET", "/api/notifications")[0] == 200)
check("older session is revoked", call(second, "GET", "/api/auth/me")[0] == 401)
status = call(first, "POST", "/api/auth/password", {"currentPassword": temp, "newPassword": original})[0]
check("password restored", status == 200, status)

# lockout
for _ in range(5):
    login("Candidate", "wrong-password-123")
check("locked after five failures", login("Candidate")[1] == 401)
sql(f"UPDATE \"User\" SET \"failedLogins\"=0, \"lockedUntil\"=NULL WHERE email='{email}'")
check("works again once unlocked", login("Candidate")[1] == 200)

# user management safeguards (nothing here sends email)
admin, _, _ = login("Administrator")
me = json.loads(call(admin, "GET", "/api/auth/me")[2])["user"]["id"]
status, _, body = call(admin, "GET", "/api/admin/users?search=candidate01&role=CANDIDATE")
listing = json.loads(body)
check("user search and filter work", status == 200 and listing["total"] == 1, body[:150])
check("user list exposes no secrets", not any(k in body for k in ("passwordHash", "googleRefreshToken", "sessionVersion")))
page = json.loads(call(admin, "GET", "/api/admin/users")[2])
check("user list is paginated", len(page["users"]) <= 20 and page["totalPages"] >= 2, page["totalPages"])
target = listing["users"][0]["id"]
check("admin cannot change own role", call(admin, "PATCH", f"/api/admin/users/{me}", {"role": "CANDIDATE"})[0] == 409)
check("admin cannot disable self", call(admin, "PATCH", f"/api/admin/users/{me}", {"status": "DISABLED"})[0] == 409)
check("admin cannot reset own password here", call(admin, "POST", f"/api/admin/users/{me}/reset-password")[0] == 409)
check("unknown fields rejected", call(admin, "PATCH", f"/api/admin/users/{target}", {"passwordHash": "x"})[0] == 400)
check("missing user is 404", call(admin, "PATCH", "/api/admin/users/999999", {"name": "x"})[0] == 404)
check("duplicate email is 409", call(admin, "POST", "/api/admin/users", {"email": listing["users"][0]["email"].upper(), "role": "ADMIN"})[0] == 409)
candidate, _, _ = login("Candidate")
check("candidate cannot edit users", call(candidate, "PATCH", f"/api/admin/users/{target}", {"role": "ADMIN"})[0] == 403)
check("candidate cannot reset passwords", call(candidate, "POST", f"/api/admin/users/{target}/reset-password")[0] == 403)
own = json.loads(call(admin, "GET", "/api/admin/users?search=candidate.demo")[2])["users"][0]["id"]
status = call(admin, "PATCH", f"/api/admin/users/{own}", {"status": "DISABLED"})[0]
check("admin disables an account", status == 200, status)
check("disabling ends that session", call(candidate, "GET", "/api/auth/me")[0] == 401)
check("admin re-enables it", call(admin, "PATCH", f"/api/admin/users/{own}", {"status": "ACTIVE"})[0] == 200)
audit = call(admin, "GET", "/api/admin/audit-logs?action=user_updated")[2]
check("change is in the audit log", "candidate.demo" in audit, audit[:200])
for path in ["/admin", "/admin/users", "/admin/audit-logs"]:
    status, _, body = call(admin, "GET", path)
    check(f"admin page {path} renders", status == 200 and "NEXT_REDIRECT" not in body, status)
check("bad audit date rejected", call(admin, "GET", "/api/admin/audit-logs?from=yesterday")[0] == 400)

# question bank (creates one throwaway question and archives it)
examiner, _, _ = login("Examiner")
candidate, _, _ = login("Candidate")
admin, _, _ = login("Administrator")
other = client()
second = re.search(r"Shared password for seeded accounts: `([^`]+)`", open("docs/TEST-ACCOUNTS.md", encoding="utf8").read()).group(1)
call(other, "POST", "/api/auth/login", {"email": "examiner2.demo@secureexam.test", "password": second})
for path in ["/api/questions", "/api/topics"]:
    check(f"candidate refused {path}", call(candidate, "GET", path)[0] == 403)
    check(f"anonymous refused {path}", call(client(), "GET", path)[0] == 401)
bank = json.loads(call(examiner, "GET", "/api/questions?search=binary&difficulty=MEDIUM")[2])
check("question search and filter work", bank["total"] == 1, bank["total"])
check("question bank is paginated", len(json.loads(call(examiner, "GET", "/api/questions")[2])["questions"]) == 20)
topic = json.loads(call(examiner, "GET", "/api/topics")[2])["topics"][0]["id"]
good = {"type": "SINGLE_CHOICE", "topicId": topic, "difficulty": "EASY", "text": "Access check question",
        "marks": 1, "options": [{"text": "A", "correct": True}, {"text": "B", "correct": False}]}
two = {**good, "options": [{"text": "A", "correct": True}, {"text": "B", "correct": True}]}
check("single choice needs exactly one correct", call(examiner, "POST", "/api/questions", two)[0] == 400)
check("duplicate options rejected", call(examiner, "POST", "/api/questions", {**good, "options": [{"text": "A", "correct": True}, {"text": "a", "correct": False}]})[0] == 400)
check("zero marks rejected", call(examiner, "POST", "/api/questions", {**good, "marks": 0})[0] == 400)
status, _, body = call(examiner, "POST", "/api/questions", good)
check("examiner creates a question", status == 201, body[:150])
qid = json.loads(body)["question"]["id"]
check("another examiner cannot read it", call(other, "GET", f"/api/questions/{qid}")[0] == 404)
check("another examiner cannot edit it", call(other, "PATCH", f"/api/questions/{qid}", {"expectedVersion": 1, "question": good})[0] in (404, 400))
check("another examiner cannot see it listed", json.loads(call(other, "GET", "/api/questions")[2])["total"] == 0)
check("candidate cannot read answer keys", call(candidate, "GET", f"/api/questions/{qid}")[0] == 403)
edit = {"expectedVersion": 1, "question": {**good, "text": "Access check question, edited"}}
status, _, body = call(examiner, "PATCH", f"/api/questions/{qid}", edit)
check("edit adds a version", status == 200 and json.loads(body)["question"]["version"] == 2, body[:150])
detail = json.loads(call(examiner, "GET", f"/api/questions/{qid}")[2])["question"]
check("old version is kept", [v["version"] for v in detail["history"]] == [2, 1])
check("stale edit is refused", call(examiner, "PATCH", f"/api/questions/{qid}", edit)[0] == 409)
check("type cannot change", call(examiner, "PATCH", f"/api/questions/{qid}", {"expectedVersion": 2, "question": {"type": "WRITTEN", "topicId": topic, "difficulty": "EASY", "text": "x", "marks": 1}})[0] == 409)

body = call(admin, "GET", "/api/questions?search=NULL")[2]
page = call(examiner, "GET", "/examiner")[2]
import re as _re
ids = sorted({int(i) for i in _re.findall(r"/examiner/exams/(\d+)/questions", page)})
check("examiner home lists exams", len(ids) >= 4, ids)
exams = {i: json.loads(call(examiner, "GET", f"/api/exams/{i}/questions")[2]) for i in ids}
draft = next(e for e in exams.values() if e["exam"]["editable"])
published = next(e for e in exams.values() if not e["exam"]["editable"])
original = [{"questionId": i["questionId"], "marks": i["marks"]} for i in draft["items"]]
path = f"/api/exams/{draft['exam']['id']}/questions"
status, _, body = call(examiner, "PUT", path, {"items": list(reversed(original))})
check("draft questions can be reordered", status == 200 and json.loads(body)["items"][0]["questionId"] == original[-1]["questionId"], body[:150])
check("repeating a question is rejected", call(examiner, "PUT", path, {"items": original + original[:1]})[0] == 400)
check("original order restored", call(examiner, "PUT", path, {"items": original})[0] == 200)
check("published exam is locked", call(examiner, "PUT", f"/api/exams/{published['exam']['id']}/questions", {"items": []})[0] == 409)
check("another examiner cannot open exam questions", call(other, "GET", path)[0] == 404)
check("candidate cannot open exam questions", call(candidate, "GET", path)[0] == 403)
check("archive hides the throwaway question", call(examiner, "POST", f"/api/questions/{qid}/archive", {"archived": True})[0] == 200
      and json.loads(call(examiner, "GET", "/api/questions?search=Access%20check")[2])["total"] == 0)
check("archived question cannot be newly added", call(examiner, "PUT", path, {"items": original + [{"questionId": qid, "marks": 1}]})[0] == 400)
for page_path in ["/examiner/questions", f"/examiner/exams/{draft['exam']['id']}/questions"]:
    status, _, body = call(examiner, "GET", page_path)
    check(f"page {page_path} renders", status == 200 and "NEXT_REDIRECT" not in body, status)

# examinations and enrolment (creates a throwaway draft and deletes it again)
from datetime import datetime, timedelta, timezone

def iso(delta):
    return (datetime.now(timezone.utc) + delta).isoformat(timespec="seconds").replace("+00:00", "Z")

examiner, _, _ = login("Examiner")
candidate, _, _ = login("Candidate")
base = {"title": "Access check exam", "instructions": "x", "startsAt": iso(timedelta(days=2)), "endsAt": iso(timedelta(days=3)),
        "durationMinutes": 30, "totalMarks": 1, "passMarks": None}
check("end before start rejected", call(examiner, "POST", "/api/exams", {**base, "endsAt": iso(timedelta(days=1))})[0] == 400)
check("duration longer than window rejected", call(examiner, "POST", "/api/exams", {**base, "endsAt": iso(timedelta(days=2, minutes=10))})[0] == 400)
check("pass mark above total rejected", call(examiner, "POST", "/api/exams", {**base, "passMarks": 5})[0] == 400)
check("client cannot set status or owner", call(examiner, "POST", "/api/exams", {**base, "status": "PUBLISHED", "ownerId": 1})[0] == 400)
check("candidate cannot create exams", call(candidate, "POST", "/api/exams", base)[0] == 403)
status, _, body = call(examiner, "POST", "/api/exams", base)
check("examiner creates a draft", status == 201, body[:150])
eid = json.loads(body)["exam"]["id"]
exam_url = f"/api/exams/{eid}"
status, _, body = call(examiner, "POST", exam_url + "/publish", {"published": True})
check("publish blocked without questions", status == 409 and "question" in body, body[:150])
question = next(q for q in json.loads(call(examiner, "GET", "/api/questions?type=SINGLE_CHOICE")[2])["questions"])
check("marks mismatch blocks publish",
      call(examiner, "PUT", exam_url + "/questions", {"items": [{"questionId": question["id"], "marks": 2}]})[0] == 200
      and call(examiner, "POST", exam_url + "/publish", {"published": True})[0] == 409)
call(examiner, "PUT", exam_url + "/questions", {"items": [{"questionId": question["id"], "marks": 1}]})
people = json.loads(call(examiner, "GET", exam_url + "/candidates?search=candidate.demo")[2])["candidates"]
check("candidate search returns names and emails only", len(people) == 1 and set(people[0]) == {"id", "name", "email"}, people)
demo_id = people[0]["id"]
admin_id = json.loads(call(login("Administrator")[0], "GET", "/api/auth/me")[2])["user"]["id"]
check("staff accounts cannot be enrolled", call(examiner, "POST", exam_url + "/enrollments", {"candidateIds": [admin_id]})[0] == 400)
check("draft is invisible to the candidate", call(candidate, "GET", f"/api/me/exams/{eid}")[0] == 404)
status, _, body = call(examiner, "POST", exam_url + "/enrollments", {"candidateIds": [demo_id]})
check("candidate enrolled", status == 201 and json.loads(body)["added"] == 1, body[:150])
check("enrolling twice adds nothing", json.loads(call(examiner, "POST", exam_url + "/enrollments", {"candidateIds": [demo_id]})[2])["added"] == 0)
check("still invisible while draft", call(candidate, "GET", f"/api/me/exams/{eid}")[0] == 404)
check("publish succeeds", call(examiner, "POST", exam_url + "/publish", {"published": True})[0] == 200)
check("publishing again is harmless", call(examiner, "POST", exam_url + "/publish", {"published": True})[0] == 200)
status, _, body = call(candidate, "GET", f"/api/me/exams/{eid}")
view = json.loads(body)["exam"]
check("candidate sees upcoming, cannot enter", view["access"]["state"] == "upcoming" and view["access"]["canEnter"] is False, view["access"])
check("no questions or answers in candidate view", question["text"] not in body and '"correct"' not in body and '"options"' not in body)
check("published schedule is locked", call(examiner, "PATCH", exam_url, {**base, "durationMinutes": 60})[0] == 400)
check("published wording can change", call(examiner, "PATCH", exam_url, {"title": "Access check exam", "instructions": "new"})[0] == 200)
check("published exam cannot be deleted", call(examiner, "DELETE", exam_url)[0] == 409)
rows = json.loads(call(examiner, "GET", exam_url + "/enrollments")[2])["enrollments"]
row = f"{exam_url}/enrollments/{rows[0]['id']}"
check("extra time needs a reason", call(examiner, "PATCH", row, {"extraMinutes": 15})[0] == 400)
check("extra time recorded", call(examiner, "PATCH", row, {"extraMinutes": 15, "reason": "Accessibility"})[0] == 200
      and json.loads(call(candidate, "GET", f"/api/me/exams/{eid}")[2])["exam"]["extraMinutes"] == 15)
other_candidate = client()
call(other_candidate, "POST", "/api/auth/login", {"email": "candidate01@secureexam.test", "password": second})
check("unenrolled candidate gets 404", call(other_candidate, "GET", f"/api/me/exams/{eid}")[0] == 404)
for method, path in [("GET", exam_url), ("GET", exam_url + "/enrollments"), ("GET", exam_url + "/candidates"), ("POST", exam_url + "/publish")]:
    status = call(other, method, path, {"published": False} if method == "POST" else None)[0]
    check(f"other examiner refused {method} {path.split('/')[-1]}", status == 404, status)
check("candidate cannot manage the exam", call(candidate, "GET", exam_url)[0] == 403)
for page_path in [f"/examiner/exams/{eid}", f"/examiner/exams/{eid}/candidates", "/examiner/exams/new", "/examiner?phase=ONGOING"]:
    status, _, body = call(examiner, "GET", page_path)
    check(f"page {page_path} renders", status == 200 and "NEXT_REDIRECT" not in body, status)
for page_path in ["/candidate", f"/candidate/exams/{eid}"]:
    status, _, body = call(candidate, "GET", page_path)
    check(f"page {page_path} renders", status == 200 and "Access check exam" in body, status)
check("candidate kept out of examiner pages", goes_to(candidate, f"/examiner/exams/{eid}", "/")[0])
state = {e["title"]: e["access"]["state"] for e in json.loads(call(candidate, "GET", "/api/me/exams")[2])["exams"]}
check("dashboard states are right", state.get("Database Systems: Quiz") in ("available", "in_progress", "submitted")
      and state.get("Computer Networks: Final") == "upcoming" and state.get("Programming Fundamentals: Midterm") == "submitted", state)
status, _, body = call(examiner, "POST", exam_url + "/duplicate")
check("exam duplicated as draft", status == 201, body[:120])
copy = json.loads(body)["exam"]["id"]
detail = json.loads(call(examiner, "GET", f"/api/exams/{copy}")[2])["exam"]
check("copy keeps questions, not candidates", detail["phase"] == "DRAFT" and detail["questions"] == 1 and detail["enrolled"] == 0, detail)
check("enrolment can be removed", call(examiner, "DELETE", row)[0] == 200)
check("unpublish works with no attempts", call(examiner, "POST", exam_url + "/publish", {"published": False})[0] == 200)
check("throwaway exams deleted", call(examiner, "DELETE", exam_url)[0] == 200 and call(examiner, "DELETE", f"/api/exams/{copy}")[0] == 200)

# attempt engine (uses its own questions and exam, and removes them afterwards)
from concurrent.futures import ThreadPoolExecutor

def run_attempt_checks():
    examiner, _, _ = login("Examiner")
    topic = json.loads(call(examiner, "GET", "/api/topics")[2])["topics"][0]["id"]
    def make(body):
        return json.loads(call(examiner, "POST", "/api/questions", {"topicId": topic, "difficulty": "EASY", **body})[2])["question"]["id"]
    q1 = make({"type": "SINGLE_CHOICE", "text": "ZZ attempt check single", "marks": 2,
               "options": [{"text": "Right", "correct": True}, {"text": "Wrong", "correct": False}]})
    q2 = make({"type": "WRITTEN", "text": "ZZ attempt check written", "marks": 3, "guidance": "SECRET-GUIDANCE", "maxLength": 50})
    body = {"title": "ZZ attempt check", "instructions": "", "startsAt": iso(timedelta(minutes=-5)), "endsAt": iso(timedelta(hours=2)),
            "durationMinutes": 30, "totalMarks": 5, "passMarks": None}
    plan = dict(body)
    eid = json.loads(call(examiner, "POST", "/api/exams", body)[2])["exam"]["id"]
    call(examiner, "PUT", f"/api/exams/{eid}/questions", {"items": [{"questionId": q1, "marks": 2}, {"questionId": q2, "marks": 3}]})
    ids = []
    for name in ["candidate01", "candidate02"]:
        ids.append(json.loads(call(examiner, "GET", f"/api/exams/{eid}/candidates?search={name}")[2])["candidates"][0]["id"])
    call(examiner, "POST", f"/api/exams/{eid}/enrollments", {"candidateIds": ids})
    check("open attempt exam published", call(examiner, "POST", f"/api/exams/{eid}/publish", {"published": True})[0] == 200)

    def candidate_client(email):
        c = client()
        call(c, "POST", "/api/auth/login", {"email": email, "password": second})
        return c
    one, two, outsider = (candidate_client(f"candidate{n}@secureexam.test") for n in ("01", "02", "03"))
    start_url = f"/api/me/exams/{eid}/attempt"
    check("resume before starting is refused", call(one, "POST", start_url, {"start": False})[0] == 409)
    check("unenrolled candidate cannot start", call(outsider, "POST", start_url, {"start": True})[0] == 404)
    check("examiner cannot start an attempt", call(examiner, "POST", start_url, {"start": True})[0] == 403)
    with ThreadPoolExecutor(4) as pool:
        replies = list(pool.map(lambda _: call(one, "POST", start_url, {"start": True}), range(4)))
    attempts = {json.loads(r[2])["attempt"]["id"] for r in replies if r[0] == 200}
    check("parallel starts give one attempt", len(attempts) == 1 and all(r[0] == 200 for r in replies), [r[0] for r in replies])
    status, _, raw = call(one, "POST", start_url, {"start": True})
    opened = json.loads(raw)
    attempt, session = opened["attempt"], opened["sessionId"]
    aid = attempt["id"]
    check("paper hides answers and notes", all(k not in raw for k in ('"correct"', "SECRET-GUIDANCE", '"difficulty', '"o1"', "optionOrder", "autoMarks")))
    check("server returns clock and deadline", attempt["serverNow"] < attempt["deadlineAt"])
    single = next(q for q in attempt["questions"] if q["type"] == "SINGLE_CHOICE")
    written = next(q for q in attempt["questions"] if q["type"] == "WRITTEN")
    key = next(o["key"] for o in single["options"] if o["text"] == "Right")

    call(examiner, "PATCH", f"/api/questions/{q1}", {"expectedVersion": 1, "question": {"type": "SINGLE_CHOICE", "topicId": topic,
         "difficulty": "EASY", "text": "ZZ attempt check CHANGED", "marks": 9, "options": [{"text": "New", "correct": True}, {"text": "Other", "correct": False}]}})
    again = call(one, "GET", f"/api/attempts/{aid}")[2]
    check("editing the bank leaves the paper unchanged", "CHANGED" not in again and "ZZ attempt check single" in again)

    def save(who, question, revision, response, sid=None):
        return call(who, "PUT", f"/api/attempts/{aid}/answers/{question}",
                    {"sessionId": sid or session, "revision": revision, "markedForReview": False, "response": response})
    check("answer saves", save(one, single["id"], 2, {"optionKeys": [key]})[0] == 200)
    stale = json.loads(save(one, single["id"], 1, {"optionKeys": []})[2])
    check("older revision is ignored", stale["saved"] is False and stale["revision"] == 2, stale)
    check("unknown option rejected", save(one, single["id"], 3, {"optionKeys": ["c9"]})[0] == 400)
    check("two options on single choice rejected", save(one, single["id"], 3, {"optionKeys": ["c1", "c2"]})[0] == 400)
    check("too long written answer rejected", save(one, written["id"], 1, {"text": "x" * 51})[0] == 400)
    check("another candidate cannot read the attempt", call(two, "GET", f"/api/attempts/{aid}")[0] == 404)
    check("another candidate cannot save into it", save(two, single["id"], 9, {"optionKeys": [key]})[0] == 404)
    check("another candidate cannot submit it", call(two, "POST", f"/api/attempts/{aid}/submit", {"sessionId": session})[0] == 404)

    taken = json.loads(call(one, "POST", start_url, {"start": False})[2])
    check("second session takes over", taken["sessionId"] != session)
    check("old session can no longer save", save(one, single["id"], 5, {"optionKeys": [key]})[0] == 409)
    session = taken["sessionId"]
    restored = next(q for q in taken["attempt"]["questions"] if q["id"] == single["id"])
    check("saved answer is restored", restored["answer"]["response"] == {"optionKeys": [key]}, restored["answer"])
    check("written answer saves", save(one, written["id"], 1, {"text": "my answer"})[0] == 200)

    status, _, raw = call(one, "POST", f"/api/attempts/{aid}/submit", {"sessionId": session})
    result = json.loads(raw)["attempt"]
    check("submit succeeds", status == 200 and result["status"] == "SUBMITTED" and result["submitReason"] == "MANUAL" and result["receipt"], raw[:150])
    check("no questions after submitting", result["questions"] == [])
    repeat = json.loads(call(one, "POST", f"/api/attempts/{aid}/submit", {"sessionId": session})[2])["attempt"]
    check("submitting again is the same result", repeat["receipt"] == result["receipt"] and repeat["submittedAt"] == result["submittedAt"])
    check("no saving after submit", save(one, single["id"], 8, {"optionKeys": [key]})[0] == 409)
    check("cannot start again", call(one, "POST", start_url, {"start": True})[0] == 409)
    row = db(f'select "gradingState", coalesce(score::text,\'none\') from "Attempt" where id={aid}')
    check("written answer waits for the examiner", row == "PENDING_MANUAL|none", row)
    check("objective answer auto graded", db(f'select w."autoMarks" from "Answer" w where w."attemptQuestionId"={single["id"]}') == "2.00")

    other_open = json.loads(call(two, "POST", start_url, {"start": True})[2])
    bid = other_open["attempt"]["id"]
    sql(f'UPDATE "Attempt" SET "startedAt"=now() at time zone \'utc\' - interval \'40 min\', "deadlineAt"=now() at time zone \'utc\' - interval \'1 min\' WHERE id={bid}')
    q = other_open["attempt"]["questions"][0]["id"]
    late = call(two, "PUT", f"/api/attempts/{bid}/answers/{q}", {"sessionId": other_open["sessionId"], "revision": 1, "markedForReview": True, "response": None})
    check("save after the deadline rejected", late[0] == 409, late[0])
    row = db(f'select status, "submitReason", "gradingState", score from "Attempt" where id={bid}')
    check("expired attempt finalized and graded", row == "SUBMITTED|TIME_EXPIRED|GRADED|0.00", row)
    check("late save recorded as incident", db(f'select count(*) from "Incident" where "attemptId"={bid} and type=\'LATE_SAVE_REJECTED\'') == "1")
    rows = json.loads(call(examiner, "GET", f"/api/exams/{eid}/enrollments")[2])["enrollments"]
    check("examiner sees attempt status", sorted(r["status"] for r in rows) == ["GRADED", "SUBMITTED"], [r["status"] for r in rows])
    check("sweep endpoint needs the secret", call(client(), "POST", "/api/cron/finalize")[0] == 401)
    status, _, body = call(one, "GET", f"/candidate/exams/{eid}/attempt")
    check("attempt page renders", status == 200 and "NEXT_REDIRECT" not in body, status)

    # exam screen rules: no going back, and the clock reports a takeover
    strict = json.loads(call(examiner, "POST", "/api/exams", {**plan, "title": "ZZ attempt check one way", "allowBackNavigation": False, "shuffleQuestions": False})[2])["exam"]["id"]
    call(examiner, "PUT", f"/api/exams/{strict}/questions", {"items": [{"questionId": q1, "marks": 2}, {"questionId": q2, "marks": 3}]})
    call(examiner, "POST", f"/api/exams/{strict}/enrollments", {"candidateIds": ids})
    call(examiner, "POST", f"/api/exams/{strict}/publish", {"published": True})
    opened = json.loads(call(one, "POST", f"/api/me/exams/{strict}/attempt", {"start": True})[2])
    sid, paper = opened["sessionId"], opened["attempt"]
    wid = paper["id"]
    first, ahead = sorted(paper["questions"], key=lambda q: q["position"])
    check("one-way paper hides later questions", ahead["hidden"] and ahead["text"] == "" and ahead["options"] == [] and not first["hidden"], ahead)
    def put(question, revision):
        return call(one, "PUT", f"/api/attempts/{wid}/answers/{question}", {"sessionId": sid, "revision": revision, "markedForReview": True, "response": None})[0]
    check("a later question cannot be answered early", put(ahead["id"], 1) == 403)
    check("the current question saves", put(first["id"], 1) == 200)
    def progress(who, session_id, position):
        return call(who, "POST", f"/api/attempts/{wid}/progress", {"sessionId": session_id, "position": position})
    check("another candidate cannot move the attempt", progress(two, sid, 2)[0] == 404)
    check("wrong session cannot move on", progress(one, "not-the-active-session", 2)[0] == 409)
    check("positions past the end change nothing", json.loads(progress(one, sid, 3)[2])["attempt"]["reachedPosition"] == 1)
    moved = json.loads(progress(one, sid, 2)[2])["attempt"]
    left = next(q for q in moved["questions"] if q["position"] == 1)
    check("moving on hides the earlier question", moved["reachedPosition"] == 2 and left["hidden"] and left["answer"] is None and left["markedForReview"], left)
    check("an earlier question cannot be changed", put(first["id"], 2) == 403)
    clock = lambda s: json.loads(call(one, "GET", f"/api/attempts/{wid}/clock?session={s}")[2])
    check("clock recognises the active session", clock(sid)["activeSession"] is True)
    check("clock reports a takeover", clock("an-older-session")["activeSession"] is False)
    sql(f'DELETE FROM "Attempt" WHERE "examId"={strict}')
    sql(f'DELETE FROM "Exam" WHERE id={strict}')

    # remove only what this block created
    sql(f'DELETE FROM "Attempt" WHERE "examId"={eid}')
    sql(f'DELETE FROM "Exam" WHERE id={eid}')
    sql(f'DELETE FROM "QuestionVersion" WHERE "questionId" IN ({q1},{q2})')
    sql(f'DELETE FROM "Question" WHERE id IN ({q1},{q2})')

def db(query):
    out = subprocess.run(["docker", "compose", "-f", "docker-compose.dev.yml", "exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "secureexam", "-tAc", query], capture_output=True, text=True, check=True)
    return out.stdout.strip()

run_attempt_checks()

print(f"\n{sum(results)}/{len(results)} checks passed")
