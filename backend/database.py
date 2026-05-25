import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "history.db")

def init_db():
    """สร้างตารางในฐานข้อมูลถ้ายังไม่มี"""
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

def save_history(data):
    """บันทึกข้อมูลลงฐานข้อมูล"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO history (prompt, model, seed, width, height, filename)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data['prompt'], 
        data['model'], 
        data['seed'], 
        data['w'], 
        data['h'],  
        data['filename']
    ))
    conn.commit()
    conn.close()

def get_history(limit=50):
    """ดึงประวัติจากฐานข้อมูล"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # ให้คืนค่าเป็น dict ได้
    c = conn.cursor()
    c.execute('SELECT * FROM history ORDER BY created_at DESC LIMIT ?', (limit,))
    rows = [dict(row) for row in c.fetchall()]
    conn.close()
    return rows