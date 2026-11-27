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
    results.append(ok)
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

print(f"\n{sum(results)}/{len(results)} checks passed")
