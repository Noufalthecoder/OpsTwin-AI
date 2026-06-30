import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "opstwin.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Workflow Versions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workflow_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version_name TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            agent TEXT NOT NULL,
            changes TEXT,
            roi_delta REAL,
            time_delta REAL,
            cost_delta REAL,
            workflow_json TEXT,
            bpmn TEXT,
            mermaid TEXT
        )
    ''')

    # Audit Logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            agent TEXT
        )
    ''')
    
    # Knowledge Graph (Nodes and Edges)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kg_nodes (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            properties TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kg_edges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT NOT NULL,
            target_id TEXT NOT NULL,
            relationship TEXT NOT NULL,
            properties TEXT,
            FOREIGN KEY(source_id) REFERENCES kg_nodes(id),
            FOREIGN KEY(target_id) REFERENCES kg_nodes(id)
        )
    ''')

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
