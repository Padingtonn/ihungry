from flask import Flask, jsonify, request, g
import sqlite3

DB = "ihungry.db"

app = Flask(__name__)

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(_):
    db = g.pop("db", None)
    if db is not None:
        db.close()

@app.get("/api/recipes")
def list_recipes():
    db = get_db()

    # базовые фильтры
    q = (request.args.get("q") or "").strip().lower()
    tag = request.args.get("tag")
    max_cal = request.args.get("maxCalories", type=int)

    #каталога
    group = request.args.get("group") 
    cal_group = request.args.get("cal")

    #фильтр
    meal_time = request.args.get("meal_time")

    base_sql = """
        SELECT r.id, r.title, r.short_desc, r.calories, r.image_url, r.servings, r.meal_time
        FROM recipes r
    """
    joins = []
    conds = []
    params = []

    if tag:
        joins.append("JOIN recipe_tags rt ON rt.recipe_id = r.id")
        joins.append("JOIN tags t ON t.id = rt.tag_id")
        conds.append("t.name = ?")
        params.append(tag)

    if q:
        conds.append("LOWER(r.title) LIKE ?")
        params.append(f"%{q}%")

    if max_cal is not None:
        conds.append("r.calories <= ?")
        params.append(max_cal)

    if group in ("breakfast", "lunch", "dinner", "dessert", "cocktail"):
        conds.append("r.meal_time = ?")
        params.append(group)

    
    if meal_time:
        conds.append("r.meal_time = ?")
        params.append(meal_time)

    if cal_group == "low":
        conds.append("r.calories <= 400")
    elif cal_group == "balanced":
        conds.append("r.calories BETWEEN 400 AND 800")
    elif cal_group == "high":
        conds.append("r.calories > 800")

    sql = base_sql
    if joins:
        sql += " " + " ".join(joins)
    if conds:
        sql += " WHERE " + " AND ".join(conds)
    sql += " ORDER BY r.id DESC LIMIT 200"

    rows = db.execute(sql, params).fetchall()

    result = []
    for r in rows:
        rec = dict(r)

        ings = db.execute(
            "SELECT name, qty, unit FROM ingredients WHERE recipe_id=?", (r["id"],)
        ).fetchall()
        rec["ingredients"] = [dict(x) for x in ings]

        trows = db.execute(
            """
            SELECT t.name
            FROM tags t
            JOIN recipe_tags rt ON rt.tag_id = t.id
            WHERE rt.recipe_id = ?
            """,
            (r["id"],),
        ).fetchall()
        rec["tags"] = [x["name"] for x in trows]

        result.append(rec)

    return jsonify(result)

@app.get("/api/recipes/<int:rid>")
def get_recipe(rid):
    db = get_db()
    r = db.execute("SELECT * FROM recipes WHERE id=?", (rid,)).fetchone()
    if not r:
        return jsonify({"error": "not_found"}), 404

    rec = dict(r)

    ings = db.execute(
        "SELECT name, qty, unit FROM ingredients WHERE recipe_id=?", (rid,)
    ).fetchall()
    rec["ingredients"] = [dict(x) for x in ings]

    tags = db.execute("""
        SELECT t.name
        FROM tags t
        JOIN recipe_tags rt ON rt.tag_id = t.id
        WHERE rt.recipe_id = ?
    """, (rid,)).fetchall()
    rec["tags"] = [x["name"] for x in tags]

    return jsonify(rec)

@app.post("/api/recipes")
def add_recipe():
    data = request.get_json(force=True)
    db = get_db()

    cur = db.execute(
        """
        INSERT INTO recipes
        (title, short_desc, calories, protein, fat, carbs, difficulty, servings, instructions, image_url, meal_time, source_url, source_category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("title"),
            data.get("short_desc"),
            int(data.get("calories", 0) or 0),
            float(data.get("protein", 0) or 0),
            float(data.get("fat", 0) or 0),
            float(data.get("carbs", 0) or 0),
            data.get("difficulty", "easy"),
            int(data.get("servings", 1) or 1),
            data.get("instructions", ""),
            data.get("image_url"),
            data.get("meal_time"),
            data.get("source_url"),
            data.get("source_category"),
        ),
    )

    rid = cur.lastrowid

    for i in data.get("ingredients", []):
        if i.get("name", "").strip():
            db.execute(
                "INSERT INTO ingredients (recipe_id, name, qty, unit) VALUES (?, ?, ?, ?)",
                (rid, i.get("name"), float(i.get("qty", 0)), i.get("unit", "г")),
            )

    for t in data.get("tags", []):
        try:
            db.execute("INSERT INTO tags(name) VALUES (?)", (t,))
        except sqlite3.IntegrityError:
            pass
        tid = db.execute("SELECT id FROM tags WHERE name=?", (t,)).fetchone()[0]
        db.execute(
            "INSERT OR IGNORE INTO recipe_tags(recipe_id, tag_id) VALUES (?, ?)",
            (rid, tid),
        )

    db.commit()
    rec = db.execute("SELECT id, title FROM recipes WHERE id=?", (rid,)).fetchone()
    return jsonify(dict(rec)), 201

if __name__ == "__main__":
    app.run(debug=True)