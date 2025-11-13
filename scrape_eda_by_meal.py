# scrape_eda_by_meal.py
"""
Импорт рецептов с eda.ru в базу ihungry.db
с заполнением поля meal_time (завтрак/обед/ужин).

Запускать локально, внимательно относиться к robots.txt и нагрузке на сайт.
"""

import re
import time
import sqlite3
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://eda.ru"
DB_PATH = "ihungry.db"
UA = "IHungryBot/1.0 (+for educational; contact: youremail@example.com)"

CATEGORY_CONFIG = {
    "/recepty/zavtraki": "breakfast",
    "/recepty/supy": "lunch",
    "/recepty/osnovnye-blyuda": "dinner",
}

HEADERS = {"User-Agent": UA}


def norm_text(x: str) -> str:
    if not x:
        return ""
    return re.sub(r"\s+", " ", x).strip()


def init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys=ON;")
    with open("shema.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()
    return conn


def get(url: str) -> requests.Response:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    return r


def get_soup(url: str) -> BeautifulSoup:
    return BeautifulSoup(get(url).text, "html.parser")


def extract_recipe_links(category_path: str, max_pages: int = 3):
    seen = set()
    links = []

    for page in range(1, max_pages + 1):
        if page == 1:
            url = urljoin(BASE_URL, category_path)
        else:
            url = urljoin(BASE_URL, f"{category_path}?page={page}")

        print(f"[list] {url}")
        soup = get_soup(url)

        for a in soup.find_all("a", href=True):
            href = a["href"]
            if not href.startswith("/recepty/"):
                continue
            if "/media/" in href:
                continue
            if href.count("/") < 3:
                continue

            full = urljoin(BASE_URL, href)
            if full not in seen:
                seen.add(full)
                links.append(full)

        time.sleep(1)

    return links


def parse_recipe_page(url: str) -> dict:
    print(f"[recipe] {url}")
    soup = get_soup(url)

    title_tag = soup.find(["h1", "h2"])
    title = norm_text(title_tag.get_text()) if title_tag else "Без названия"

    text = soup.get_text(" ", strip=True)

    calories = 0
    m = re.search(r"(\d+)\s*ккал", text)
    if m:
        calories = int(m.group(1))

    servings = 1
    m2 = re.search(r"порции?:?\s*(\d+)", text, re.IGNORECASE)
    if m2:
        servings = int(m2.group(1))

    protein = fat = carbs = 0.0

    instructions = text

    return {
        "title": title,
        "calories": calories,
        "protein": protein,
        "fat": fat,
        "carbs": carbs,
        "servings": servings,
        "instructions": instructions,
    }


def import_category(conn: sqlite3.Connection, category_path: str, meal_time: str, max_pages: int = 2, limit_recipes: int = 40):
    links = extract_recipe_links(category_path, max_pages=max_pages)
    if limit_recipes:
        links = links[:limit_recipes]

    cur = conn.cursor()
    imported = 0

    for url in links:
        row = cur.execute("SELECT id FROM recipes WHERE source_url = ?", (url,)).fetchone()
        if row:
            print(f"[skip] already imported {url}")
            continue

        data = parse_recipe_page(url)

        cur.execute(
            """
            INSERT INTO recipes
            (title, short_desc, calories, protein, fat, carbs, difficulty, servings, instructions, image_url, meal_time, source_url, source_category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data["title"],
                None,
                data["calories"],
                data["protein"],
                data["fat"],
                data["carbs"],
                "easy",
                data["servings"],
                data["instructions"],
                None,
                meal_time,
                url,
                category_path.strip("/").split("/")[-1],
            ),
        )
        rid = cur.lastrowid
        conn.commit()
        imported += 1
        print(f"[ok] {rid} {data['title']!r}")
        time.sleep(0.5)

    print(f"[done] {category_path} -> imported {imported} recipes")


def main():
    conn = init_db()

    import_category(conn, "/recepty/zavtraki", "breakfast", max_pages=2, limit_recipes=40)
    import_category(conn, "/recepty/supy", "lunch", max_pages=2, limit_recipes=40)
    import_category(conn, "/recepty/osnovnye-blyuda", "dinner", max_pages=2, limit_recipes=40)

    conn.close()


if __name__ == "__main__":
    main()
