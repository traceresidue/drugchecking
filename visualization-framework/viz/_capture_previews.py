from pathlib import Path
from playwright.sync_api import sync_playwright

DIR = Path(__file__).resolve().parent
OUT = DIR / "review-previews"
OUT.mkdir(exist_ok=True)

files = sorted(set(DIR.glob("[0-9][0-9]-*.html")) | set(DIR.glob("[0-9][0-9][a-z]-*.html")))

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1180, "height": 900})
    # pages carry an auth guard that redirects when dcf_auth is missing
    page.add_init_script("try{localStorage.setItem('dcf_auth',String(Date.now()))}catch(e){}")
    for file in files:
        url = f"http://127.0.0.1:8765/{file.name}"
        page.goto(url, wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(2000)
        out = OUT / f"{file.stem}.png"
        stage = page.locator("#stage")
        if stage.count():
            stage.screenshot(path=str(out))
        else:
            page.screenshot(path=str(out))
        print("ok", out.name)
    browser.close()
