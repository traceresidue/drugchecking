from pathlib import Path
from playwright.sync_api import sync_playwright

DIR = Path(__file__).resolve().parent
OUT = DIR / "review-previews"
OUT.mkdir(exist_ok=True)

files = sorted(DIR.glob("[0-9][0-9]-*.html"))

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1180, "height": 900})
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
