import asyncio
import re
from typing import Literal

import httpx
from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="TraceZero API", version="2.0.0")

SERVICES = [
    ("Telegram", "Мессенджер", "https://t.me/{u}", "https://my.telegram.org/auth?to=delete"),
    ("Instagram", "Социальная сеть", "https://www.instagram.com/{u}/", "https://accountscenter.instagram.com/personal_info/account_ownership_and_control/deactivation_or_deletion/"),
    ("VK", "Социальная сеть", "https://vk.com/{u}", "https://vk.com/settings?act=deactivate"),
    ("GitHub", "Разработка", "https://github.com/{u}", "https://github.com/settings/admin"),
    ("GitLab", "Разработка", "https://gitlab.com/{u}", "https://gitlab.com/-/profile/account"),
    ("Reddit", "Социальная сеть", "https://www.reddit.com/user/{u}/", "https://www.reddit.com/settings/account"),
    ("Pinterest", "Контент", "https://www.pinterest.com/{u}/", "https://www.pinterest.com/settings/privacy-and-data/"),
    ("Twitch", "Стриминг", "https://www.twitch.tv/{u}", "https://www.twitch.tv/settings/security"),
    ("Medium", "Публикации", "https://medium.com/@{u}", "https://medium.com/me/settings/security"),
    ("Vimeo", "Видео", "https://vimeo.com/{u}", "https://vimeo.com/settings/account"),
    ("SoundCloud", "Музыка", "https://soundcloud.com/{u}", "https://soundcloud.com/settings/account"),
    ("Steam", "Игры", "https://steamcommunity.com/id/{u}", "https://help.steampowered.com/en/wizard/HelpDeleteAccount"),
    ("Keybase", "Идентичность", "https://keybase.io/{u}", "https://keybase.io/account/delete"),
    ("Docker Hub", "Разработка", "https://hub.docker.com/u/{u}", "https://hub.docker.com/settings/general"),
    ("Behance", "Портфолио", "https://www.behance.net/{u}", "https://www.behance.net/settings"),
]

class ScanResult(BaseModel):
    service: str
    category: str
    profile_url: str
    delete_url: str
    status: Literal["found", "not_found", "unknown"]
    http_status: int | None = None

async def check_service(client: httpx.AsyncClient, service: tuple[str, str, str, str], username: str) -> ScanResult:
    name, category, profile_tpl, delete_url = service
    url = profile_tpl.format(u=username)
    try:
        response = await client.get(url, follow_redirects=True)
        code = response.status_code
        if code == 404:
            status = "not_found"
        elif code in (401, 403, 429):
            status = "unknown"
        elif 200 <= code < 400:
            text = response.text[:7000].lower()
            missing = ["page not found", "user not found", "doesn't exist", "does not exist", "profile not found", "страница удалена", "такой страницы нет"]
            status = "not_found" if any(marker in text for marker in missing) else "found"
        else:
            status = "unknown"
        return ScanResult(service=name, category=category, profile_url=url, delete_url=delete_url, status=status, http_status=code)
    except httpx.HTTPError:
        return ScanResult(service=name, category=category, profile_url=url, delete_url=delete_url, status="unknown")

@app.get("/api/health")
def health():
    return {"ok": True, "version": "2.0.0", "mode": "self-audit-only"}

@app.get("/api/scan", response_model=list[ScanResult])
async def scan(username: str = Query(min_length=2, max_length=40)):
    username = username.strip()
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", username):
        return []
    timeout = httpx.Timeout(9.0, connect=4.0)
    headers = {"User-Agent": "TraceZero/2.0 privacy self-audit; owner-verified identifiers only"}
    async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
        return await asyncio.gather(*(check_service(client, service, username) for service in SERVICES))

app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/{path:path}")
def spa(path: str):
    return FileResponse("dist/index.html", headers={"Cache-Control": "no-store, max-age=0"})
