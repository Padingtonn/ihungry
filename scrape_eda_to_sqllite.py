# scrape_eda_to_sqlite.py
import json, re, sqlite3, time
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

BASE = "https://eda.ru"
DB   = "ihungry.db"
UA   = "IHungryBot/1.0 (+for educational; contact: youremail@example.com)"

LIST_URL = BASE + "/recepty?page={page}"

def norm_text(x):
    if not x: return ""
    return re.sub(r"\s+", " ", x).strip()

def init_db():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA foreign_keys=ON;")
    with open("schema.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()
    return conn

def get(url):
    r = requests.get(url, headers={"User-Agent": UA}, timeout=20)
    r.raise_for_status()
    return r

def extract_links_from_list(html):
    soup = BeautifulSoup(html, "html.parser")
    links = set()
    # ссылки рецептов
    for a in soup.select('a[href^="/recepty/"]'):
        href = a.get("href")
        if href.count("/") > 2:
            links.add(urljoin(BASE, href.split("?")[0]))
    return sorted(links)

def parse_json_ld(soup):
    data = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            block = json.loads(tag.string.strip())
            if isinstance(block, list):
                data.extend(block)
            else:
                data.append(block)
        except Exception:
            continue
    # ищем объект с "@type": "Recipe"
    for obj in data:
        t = obj.get("@type")
        if t == "Recipe" or (isinstance(t, list) and "Recipe" in t):
            return obj
    return None

def parse_recipe(url):
    r = get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    j = parse_json_ld(soup)
    if not j:
        # fallback — минимум
        title = norm_text(soup.select_one("h1").get_text()) if soup.select_one("h1") else url
        return {
            "title": title,
            "short_desc": "",
            "calories": 0, "protein": 0, "fat": 0, "carbs": 0,
            "servings": 1,
            "instructions": "",
            "ingredients": [],
            "tags": [],
            "image_url": None
        }

    title = norm_text(j.get("name"))
    desc  = norm_text(j.get("description"))
    image = None
    if isinstance(j.get("image"), dict):
        image = j["image"].get("url")
    elif isinstance(j.get("image"), list):
        image = j["image"][0]
    elif isinstance(j.get("image"), str):
        image = j["image"]

    # ингредиенты
    ingredients = []
    for it in j.get("recipeIngredient", []) or []:
        name = norm_text(it)
        qty = 0.0; unit = "г"
        m = re.search(r"([\d\.,/]+)\s*([^\d]+)$", name)
        if m:
            try:
                qty = float(str(m.group(1)).replace(",", ".").split("/")[0])
            except:
                qty = 0.0
            unit = norm_text(m.group(2))
            name = norm_text(name[:m.start()].strip("—-: "))
        ingredients.append({"name": name, "qty": qty, "unit": unit})

    # шаги
    instructions = ""
    steps = j.get("recipeInstructions") or []
    if isinstance(steps, list):
        parts = []
        for s in steps:
            if isinstance(s, dict):
                parts.append(norm_text(s.get("text")))
            else:
                parts.append(norm_text(str(s)))
        instructions = "\n".join([p for p in parts if p])
    elif isinstance(steps, str):
        instructions = norm_text(steps)