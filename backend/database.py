import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "history.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT,
            model TEXT,
            seed INTEGER,
            width INTEGER,
            height INTEGER,
            filename TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def save_history(prompt, model, seed, w, h, filename):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO history (prompt, model, seed, width, height, filename)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (prompt, model, seed, w, h, filename))
    conn.commit()
    conn.close()

def get_history(limit=50):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM history ORDER BY created_at DESC LIMIT ?', (limit,))
    rows = [dict(row) for row in c.fetchall()]
    conn.close()
    return rows