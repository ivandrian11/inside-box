use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use chrono::Local;

// Setting structure for JSON serialization
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub updated_at: String,
}

// Session log structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionLog {
    pub id: i64,
    pub ticket_code: String,
    pub template_name: Option<String>,
    pub filter_used: Option<String>,
    pub photo_count: i32,
    pub place: Option<String>,
    pub session_price: i32,
    pub session_duration: i32,
    pub actual_duration: i32,
    pub drive_url: Option<String>,
    pub created_at: String,
}

// Database wrapper with thread-safe connection
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> SqliteResult<Self> {
        let db_path = get_database_path();
        
        // Create directory if not exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        
        let conn = Connection::open(&db_path)?;
        
        // Initialize tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS session_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_code TEXT NOT NULL UNIQUE,
                template_name TEXT,
                photo_count INTEGER DEFAULT 0,
                place TEXT,
                session_price INTEGER DEFAULT 25,
                session_duration INTEGER DEFAULT 10,
                drive_url TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        // Remove background_name column if SQLite version supports it
        conn.execute(
            "ALTER TABLE session_logs DROP COLUMN background_name",
            [],
        ).ok();

        // Add filter_name column if not exists (migration)
        conn.execute(
            "ALTER TABLE session_logs ADD COLUMN filter_name TEXT",
            [],
        ).ok();


        // Add actual_duration column if not exists (migration)
        conn.execute(
            "ALTER TABLE session_logs ADD COLUMN actual_duration INTEGER DEFAULT 0",
            [],
        ).ok();

        // Add place column if not exists (migration)
        conn.execute(
            "ALTER TABLE session_logs ADD COLUMN place TEXT",
            [],
        ).ok();

        // Add drive_url column if not exists (migration)
        conn.execute(
            "ALTER TABLE session_logs ADD COLUMN drive_url TEXT",
            [],
        ).ok();

        // Remove printed column if sqlite version supports it
        conn.execute(
            "ALTER TABLE session_logs DROP COLUMN printed",
            [],
        ).ok();

        // Create index for faster queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_session_logs_created_at ON session_logs(created_at)",
            [],
        )?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_session_logs_ticket_code ON session_logs(ticket_code)",
            [],
        )?;
        
        println!("📦 Database initialized at: {:?}", db_path);
        
        Ok(Self { conn: Mutex::new(conn) })
    }
    
    // Get a setting by key
    pub fn get_setting(&self, key: &str) -> Option<String> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT value FROM settings WHERE key = ?",
            [key],
            |row| row.get(0),
        ).ok()
    }
    
    // Set a setting (insert or update)
    pub fn set_setting(&self, key: &str, value: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
            [key, value],
        )?;
        Ok(())
    }
    
    // Get all settings
    pub fn get_all_settings(&self) -> SqliteResult<Vec<Setting>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT key, value, updated_at FROM settings")?;
        let settings = stmt.query_map([], |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })?;
        
        settings.collect()
    }
    
    // Delete a setting
    pub fn delete_setting(&self, key: &str) -> SqliteResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute("DELETE FROM settings WHERE key = ?", [key])?;
        Ok(affected > 0)
    }
    
    // Log a session (uses INSERT OR REPLACE to prevent duplicates)
    pub fn log_session(
        &self,
        ticket_code: &str,
        template_name: Option<&str>,
        filter_name: Option<&str>,
        photo_count: i32,
        place: Option<&str>,
        session_price: i32,
        session_duration: i32,
        actual_duration: i32,
        drive_url: Option<&str>,
    ) -> SqliteResult<i64> {
        let created_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO session_logs (ticket_code, template_name, filter_name, photo_count, place, session_price, session_duration, actual_duration, drive_url, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                ticket_code,
                template_name,
                filter_name,
                photo_count,
                place,
                session_price,
                session_duration,
                actual_duration,
                drive_url,
                created_at
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    // Update Google Drive URL for a session
    pub fn update_session_drive_url(&self, ticket_code: &str, drive_url: &str) -> SqliteResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "UPDATE session_logs SET drive_url = ? WHERE ticket_code = ?",
            rusqlite::params![drive_url, ticket_code],
        )?;
        Ok(affected > 0)
    }
    
    // Get session logs for today
    pub fn get_today_sessions(&self) -> SqliteResult<Vec<SessionLog>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, ticket_code, template_name, filter_name, photo_count, place, session_price, session_duration, actual_duration, drive_url, created_at 
             FROM session_logs 
             WHERE date(created_at) = date('now')
             ORDER BY created_at DESC"
        )?;
        
        let sessions = stmt.query_map([], |row| {
            Ok(SessionLog {
                id: row.get(0)?,
                ticket_code: row.get(1)?,
                template_name: row.get(2)?,
                filter_used: row.get(3)?,
                photo_count: row.get(4)?,
                place: row.get(5)?,
                session_price: row.get(6)?,
                session_duration: row.get(7)?,
                actual_duration: row.get(8)?,
                drive_url: row.get(9)?,
                created_at: row.get(10)?,
            })
        })?;
        
        sessions.collect()
    }
    
    // Get session stats for today
    pub fn get_today_stats(&self) -> SqliteResult<(i32, i32)> {
        let conn = self.conn.lock().unwrap();
        let result = conn.query_row(
            "SELECT 
                COUNT(*) as total_sessions,
                SUM(session_price) as total_revenue
             FROM session_logs 
             WHERE date(created_at) = date('now')",
            [],
            |row| {
                Ok((
                    row.get::<_, i32>(0)?,
                    row.get::<_, i32>(1).unwrap_or(0),
                ))
            },
        )?;
        Ok(result)
    }

    // Get ALL sessions (for export)
    pub fn get_all_sessions(&self) -> SqliteResult<Vec<SessionLog>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, ticket_code, template_name, filter_name, photo_count, place, session_price, session_duration, actual_duration, drive_url, created_at 
             FROM session_logs 
             ORDER BY created_at ASC"
        )?;
        
        let sessions = stmt.query_map([], |row| {
            Ok(SessionLog {
                id: row.get(0)?,
                ticket_code: row.get(1)?,
                template_name: row.get(2)?,
                filter_used: row.get(3)?,
                photo_count: row.get(4)?,
                place: row.get(5)?,
                session_price: row.get(6)?,
                session_duration: row.get(7)?,
                actual_duration: row.get(8)?,
                drive_url: row.get(9)?,
                created_at: row.get(10)?,
            })
        })?;
        
        sessions.collect()
    }

    // Clear all sessions (Reset Database)
    pub fn clear_all_sessions(&self) -> SqliteResult<bool> {
        let conn = self.conn.lock().unwrap();
        // Use DELETE instead of TRUNCATE for SQLite compatibility
        conn.execute("DELETE FROM session_logs", [])?;
        // Optional: Reset auto-increment counter
        // conn.execute("DELETE FROM sqlite_sequence WHERE name='session_logs'", [])?;
        Ok(true)
    }
}

// Get database path
fn get_database_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join("RuaRasaBooth").join("data").join("booth.db")
}

// Global database instance (lazy initialization)
use std::sync::OnceLock;
static DATABASE: OnceLock<Database> = OnceLock::new();

pub fn get_database() -> &'static Database {
    DATABASE.get_or_init(|| {
        Database::new().expect("Failed to initialize database")
    })
}
