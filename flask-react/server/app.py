from datetime import date, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DB_PATH = os.path.join(os.path.dirname(__file__), "ihungry.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# ------------ MODELS ------------
recipe_tags = db.Table(
    "recipe_tags",
    db.Column("recipe_id", db.Integer, db.ForeignKey("recipe.id"), primary_key=True),
    db.Column("tag_id", db.Integer, db.ForeignKey("tag.id"), primary_key=True),
)

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    calories = db.Column(db.Integer, nullable=False)  # per serving
    servings = db.Column(db.Integer, nullable=False, default=1)
    instructions = db.Column(db.Text, default="")
    ingredients = db.relationship("Ingredient", backref="recipe", cascade="all,delete")
    tags = db.relationship("Tag", secondary=recipe_tags, lazy="joined")

class Ingredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey("recipe.id"))
    name = db.Column(db.String(120), nullable=False)
    qty = db.Column(db.Float, nullable=False, default=1.0)
    unit = db.Column(db.String(30), default="pcs")

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(40), unique=True, nullable=False)

class MealPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    day = db.Column(db.Date, nullable=False)
    slot = db.Column(db.String(20), nullable=False)  # breakfast/lunch/dinner
    recipe_id = db.Column(db.Integer, db.ForeignKey("recipe.id"), nullable=False)
    recipe = db.relationship("Recipe")

# ------------ HELPERS ------------
def recipe_to_dict(r: Recipe):
    return {
        "id": r.id,
        "title": r.title,
        "calories": r.calories,
        "servings": r.servings,
        "tags": [t.name for t in r.tags],
        "ingredients": [{"name": i.name, "qty": i.qty, "unit": i.unit} for i in r.ingredients],
    }

def ensure_seed():
    if Recipe.query.count() > 0:
        return
    t_fast = Tag(name="быстро")
    t_veg = Tag(name="вегетарианское")
    t_fit = Tag(name="низкокалорийное")
    db.session.add_all([t_fast, t_veg, t_fit])

    pasta = Recipe(title="Паста с томатами", calories=520, servings=2, instructions="Сварить пасту, соус.")
    pasta.ingredients = [
        Ingredient(name="Спагетти", qty=200, unit="г"),
        Ingredient(name="Томатный соус", qty=250, unit="мл"),
        Ingredient(name="Сыр", qty=30, unit="г"),
    ]
    pasta.tags = [t_fast, t_veg]

    salad = Recipe(title="Салат цезарь", calories=380, servings=2, instructions="Собрать салат.")
    salad.ingredients = [
        Ingredient(name="Курица", qty=200, unit="г"),
        Ingredient(name="Салат ромэн", qty=1, unit="шт"),
        Ingredient(name="Сыр", qty=30, unit="г"),
    ]
    salad.tags = [t_fit]

    oats = Recipe(title="Овсянка с бананом", calories=320, servings=1, instructions="Сварить овсянку.")
    oats.ingredients = [
        Ingredient(name="Овсянка", qty=60, unit="г"),
        Ingredient(name="Молоко", qty=200, unit="мл"),
        Ingredient(name="Банан", qty=1, unit="шт"),
    ]
    oats.tags = [t_fit, t_fast, t_veg]

    db.session.add_all([pasta, salad, oats])
    db.session.commit()

with app.app_context():
    db.create_all()
    ensure_seed()

# ------------ ROUTES ------------
@app.get("/api/recipes")
def list_recipes():
    q = request.args.get("q", "").lower()
    tag = request.args.get("tag")
    max_cal = request.args.get("maxCalories", type=int)
    query = Recipe.query
    if q:
        query = query.filter(Recipe.title.ilike(f"%{q}%"))
    if tag:
        query = query.join(Recipe.tags).filter(Tag.name == tag)
    if max_cal is not None:
        query = query.filter(Recipe.calories <= max_cal)
    return jsonify([recipe_to_dict(r) for r in query.order_by(Recipe.id.desc()).all()])

@app.post("/api/recipes")
def create_recipe():
    data = request.json
    r = Recipe(
        title=data["title"],
        calories=int(data.get("calories", 0)),
        servings=int(data.get("servings", 1)),
        instructions=data.get("instructions", "")
    )
    # tags
    r.tags = []
    for t in data.get("tags", []):
        tag = Tag.query.filter_by(name=t).first() or Tag(name=t)
        r.tags.append(tag)
    # ingredients
    r.ingredients = [Ingredient(name=i["name"], qty=float(i.get("qty",1)), unit=i.get("unit","pcs"))
                     for i in data.get("ingredients", [])]
    db.session.add(r)
    db.session.commit()
    return jsonify(recipe_to_dict(r)), 201

@app.get("/api/tags")
def list_tags():
    return jsonify([t.name for t in Tag.query.order_by(Tag.name).all()])

@app.get("/api/plan/week")
def get_week():
    start = request.args.get("start")  # YYYY-MM-DD (понедельник)
    if start:
        y,m,d = map(int, start.split("-"))
        start_d = date(y,m,d)
    else:
        start_d = date.today()
        start_d = start_d - timedelta(days=start_d.weekday())
    end_d = start_d + timedelta(days=6)
    rows = (MealPlan.query.filter(MealPlan.day.between(start_d, end_d))
                        .order_by(MealPlan.day, MealPlan.slot).all())
    return jsonify([{"id": r.id, "day": r.day.isoformat(), "slot": r.slot,
                     "recipe": recipe_to_dict(r.recipe)} for r in rows])

@app.post("/api/plan")
def add_to_plan():
    data = request.json  # {day: "YYYY-MM-DD", slot: "breakfast|lunch|dinner", recipeId:int}
    y,m,d = map(int, data["day"].split("-"))
    row = MealPlan(day=date(y,m,d), slot=data["slot"], recipe_id=int(data["recipeId"]))
    db.session.add(row)
    db.session.commit()
    return jsonify({"id": row.id}), 201

@app.get("/api/shopping-list")
def shopping_list():
    start = request.args.get("start")
    end = request.args.get("end")
    y1,m1,d1 = map(int, start.split("-"))
    y2,m2,d2 = map(int, end.split("-"))
    rows = (MealPlan.query.filter(MealPlan.day.between(date(y1,m1,d1), date(y2,m2,d2))).all())
    # агрегируем ингредиенты
    agg = {}
    for r in rows:
        for ing in r.recipe.ingredients:
            key = (ing.name.lower(), ing.unit)
            agg[key] = agg.get(key, 0) + ing.qty
    items = [{"name": n, "qty": round(q,2), "unit": u} for (n,u), q in agg.items()]
    return jsonify(sorted(items, key=lambda x: x["name"]))

@app.get("/")
def index():
    return "IHUNGRY API is running"
