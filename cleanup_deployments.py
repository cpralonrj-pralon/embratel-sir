"""
Limpa deployments antigos do GitHub Pages.
GitHub Pages trava quando há muitos deployments acumulados.
"""
import urllib.request
import urllib.error
import json
import time

# ─── CONFIGURAÇÃO ─────────────────────────────────────
OWNER = "cpralonrj-pralon"
REPO  = "embratel-sir"
# Crie um token em: https://github.com/settings/tokens
# Permissões necessárias: repo (deployments)
TOKEN = input("Cole seu GitHub Personal Access Token: ").strip()
KEEP_LAST = 5   # quantos deployments recentes manter
# ──────────────────────────────────────────────────────

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cleanup-script"
}

BASE = f"https://api.github.com/repos/{OWNER}/{REPO}"


def api(method, path, data=None):
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            content = r.read()
            return r.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        return e.code, {}


def get_deployments(page=1):
    url = f"{BASE}/deployments?per_page=100&page={page}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  Erro ao buscar pagina {page}: {e}")
        return []


def deactivate(dep_id):
    status, _ = api("POST", f"/deployments/{dep_id}/statuses",
                    {"state": "inactive"})
    return status in (200, 201)


def delete_dep(dep_id):
    status, _ = api("DELETE", f"/deployments/{dep_id}")
    return status in (200, 204)


def main():
    print(f"\nBuscando deployments de {OWNER}/{REPO}...")

    all_ids = []
    page = 1
    while True:
        deps = get_deployments(page)
        if not deps:
            break
        all_ids.extend(d["id"] for d in deps)
        print(f"  Pagina {page}: {len(deps)} deployments (total: {len(all_ids)})")
        if len(deps) < 100:
            break
        page += 1
        time.sleep(0.3)

    total = len(all_ids)
    print(f"\nTotal encontrado: {total} deployments")

    if total <= KEEP_LAST:
        print(f"Menos de {KEEP_LAST} deployments. Nada a fazer.")
        return

    to_delete = all_ids[KEEP_LAST:]
    print(f"Deletando {len(to_delete)} deployments antigos (mantendo {KEEP_LAST} recentes)...")

    ok = 0
    fail = 0
    for i, dep_id in enumerate(to_delete, 1):
        deactivate(dep_id)
        time.sleep(0.1)
        if delete_dep(dep_id):
            ok += 1
        else:
            fail += 1

        if i % 200 == 0:
            pct = i / len(to_delete) * 100
            print(f"  [{i}/{len(to_delete)}] {pct:.0f}% -- {ok} deletados, {fail} falhas")
        time.sleep(0.1)

    print(f"\nConcluido! {ok} deletados | {fail} falhas | {KEEP_LAST} mantidos")
    print("Agora tente fazer o deploy novamente.")


if __name__ == "__main__":
    main()
