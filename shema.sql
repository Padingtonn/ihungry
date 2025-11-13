-- schema.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  short_desc TEXT,
  calories INTEGER DEFAULT 0,
  protein REAL DEFAULT 0,
  fat REAL DEFAULT 0,
  carbs REAL DEFAULT 0,
  difficulty TEXT CHECK(difficulty IN ('easy','medium','hard')) DEFAULT 'easy',
  servings INTEGER DEFAULT 1,
  instructions TEXT,
  image_url TEXT,
  meal_time TEXT CHECK(meal_time IN ('breakfast','lunch','dinner','dessert','cocktail')),
  source_url TEXT UNIQUE,
  source_category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  qty REAL DEFAULT 0,
  unit TEXT DEFAULT 'г',
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (recipe_id, tag_id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);