mod database;

use base64::{engine::general_purpose::STANDARD, Engine};
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use warp::Filter;

use database::{get_database, Setting, SessionLog};

// Webhook payload structure
#[derive(Debug, Deserialize, Serialize, Clone)]
struct PaymentConfirmation {
    ticket_code: String,
    #[serde(default)]
    amount: Option<i32>,
    #[serde(default)]
    cashier_id: Option<String>,
}

// Response structure
#[derive(Debug, Serialize)]
struct WebhookResponse {
    success: bool,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    state: Option<CameraState>,
}

// Camera State
#[derive(Debug, Deserialize, Serialize, Clone, Default)]
struct CameraState {
    #[serde(default)]
    flip_h: bool,
    #[serde(default)]
    flip_v: bool,
    #[serde(default)]
    is_portrait: bool,
}

// Remote capture command
#[derive(Debug, Deserialize, Serialize, Clone)]
struct RemoteCaptureCommand {
    ticket_code: String,
    #[serde(default)]
    action: String, // "capture", "flip_h", "flip_v", "toggle_portrait", or "sync"
    #[serde(default)]
    state: Option<CameraState>, // For syncing state from Booth
}

// Session state for syncing between booth and remote
#[derive(Debug, Deserialize, Serialize, Clone, Default)]
struct SessionState {
    #[serde(default)]
    current_step: String, // "capture", "arrange", "result"
    #[serde(default)]
    photos: Vec<String>, // Base64 or URL of captured photos
    #[serde(default)]
    photo_count: usize,
    #[serde(default)]
    sorted_filenames: Vec<String>,
}

// Photo info for gallery
#[derive(Debug, Serialize, Clone)]
struct PhotoInfo {
    filename: String,
    url: String,
}

// Xendit QR Request
#[derive(Debug, Serialize, Clone)]
struct XenditQrRequest {
    reference_id: String,
    #[serde(rename = "type")]
    qr_type: String, // "DYNAMIC"
    currency: String,
    amount: f64,
    // callback_url can be optional, but useful for override
    #[serde(skip_serializing_if = "Option::is_none")]
    callback_url: Option<String>,
}

// Xendit QR Response
#[derive(Debug, Deserialize, Clone)]
#[allow(dead_code)]
struct XenditQrResponse {
    id: String,
    qr_string: String,
    status: String,
}

// Get photos directory
fn get_photos_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join("RuaRasaBooth").join("photos")
}

#[tauri::command]
async fn create_xendit_qr(ticket_code: String, amount: i32) -> Result<String, String> {
    let db = get_database();
    
    // 1. Get Settings
    let secret_key = db.get_setting("xendit_secret_key").ok_or("Xendit Secret Key not set")?;
    let tunnel_url = db.get_setting("tunnel_url").ok_or("Tunnel URL not set. Please set up cloudflared.")?;

    let callback_url = format!("{}/webhook/xendit-qris", tunnel_url);
    println!("🔐 Creating Xendit QR for {} (ID: {}) with webhook: {}", amount, ticket_code, callback_url);
    
    // 2. Prepare Request
    let client = reqwest::Client::new();
    let body = XenditQrRequest {
        reference_id: ticket_code,
        qr_type: "DYNAMIC".to_string(),
        currency: "IDR".to_string(),
        amount: amount as f64,
        callback_url: Some(callback_url),
    };

    // 3. Call Xendit API
    let response = client.post("https://api.xendit.co/qr_codes")
        .basic_auth(secret_key, Some("")) // Username=SecretKey, Password=""
        .header("api-version", "2022-07-31")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Xendit Request Failed: {}", e))?;

    if !response.status().is_success() {
        let err_text = response.text().await.unwrap_or_default();
        println!("❌ Xendit Error: {}", err_text);
        return Err(format!("Xendit API Error: {}", err_text));
    }
    
    let resp_json: serde_json::Value = response.json().await.map_err(|e| format!("Invalid JSON: {}", e))?;
    
    // Get qr_string from response
    let qr_string = resp_json["qr_string"]
        .as_str()
        .ok_or("QR String not found in response")?
        .to_string();
        
    Ok(qr_string)
}

// Save photo to local storage
#[tauri::command]
fn save_photo(ticket_code: String, photo_data: String, filename: String) -> Result<String, String> {
    let photos_dir = get_photos_dir();
    let ticket_dir = photos_dir.join(&ticket_code);

    // Create directory if not exists
    fs::create_dir_all(&ticket_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    // Remove data URL prefix if present dynamically (supports png, jpeg, webp, etc)
    let base64_data = if let Some(idx) = photo_data.find("base64,") {
        &photo_data[idx + 7..]
    } else {
        &photo_data
    };

    // Decode base64
    let image_data = STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Save file
    let file_path = ticket_dir.join(&filename);
    fs::write(&file_path, image_data).map_err(|e| format!("Failed to write file: {}", e))?;

    println!("📸 Saved photo: {:?}", file_path);

    Ok(format!("/photos/{}/{}", ticket_code, filename))
}

// Get local IP address
fn get_local_ip() -> String {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "localhost".to_string())
}

// Get gallery URL for QR code
#[tauri::command]
fn get_gallery_url(ticket_code: String) -> String {
    let ip = get_local_ip();
    format!("http://{}:3847/gallery/{}", ip, ticket_code)
}


// Delete photos by date offset (0 = today, 1 = yesterday, etc.)
#[tauri::command]
fn delete_photos_by_date(days_ago: i64) -> Result<String, String> {
    let photos_dir = get_photos_dir();
    if !photos_dir.exists() {
        return Ok("Folder foto tidak ditemukan".to_string());
    }

    let target_date = Local::now()
        .checked_sub_signed(chrono::Duration::days(days_ago))
        .map(|d| d.date_naive())
        .ok_or("Invalid date calculation")?;

    let mut deleted_count = 0;

    if let Ok(entries) = fs::read_dir(&photos_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(created) = metadata.created() {
                        let created_date: chrono::DateTime<Local> = created.into();
                        if created_date.date_naive() == target_date {
                            println!("🗑️ Deleting folder: {:?}", entry.path());
                            if fs::remove_dir_all(entry.path()).is_ok() {
                                deleted_count += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    let date_str = if days_ago == 0 { "hari ini" } else { "kemarin" };
    Ok(format!("Berhasil menghapus {} folder foto {}", deleted_count, date_str))
}

// Exit application command
#[tauri::command]
fn exit_app() {
    std::process::exit(0);
}

#[tauri::command]
async fn print_ticket_result(ticket_code: String) -> Result<String, String> {
    let photos_dir = get_photos_dir();
    let file_path = photos_dir.join(&ticket_code).join("hasil_template.png");

    // Retry loop: Tunggu file muncul sampai 5 detik
    let mut retries = 0;
    while !file_path.exists() && retries < 10 {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        retries += 1;
        println!("⏳ Waiting for file... {}/10", retries);
    }

    if !file_path.exists() {
        return Err(format!("File hasil foto tidak ditemukan di: {:?}", file_path));
    }

    let path_str = file_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        println!("🖨️ Printing file via PowerShell .NET (Respects Default Preferences): {}", path_str);
        
        // Gunakan PowerShell dengan .NET System.Drawing.Printing
        // Ini akan menggunakan Default Printer dengan preferensi (Ukuran Kertas, dll) yang sudah diset di Windows
        // Tanpa membuka dialog atau aplikasi GUI
        let ps_script = format!(
            r#"
            add-type -AssemblyName System.Drawing
            $doc = New-Object System.Drawing.Printing.PrintDocument
            $doc.DocumentName = "Rua Rasa Photo Booth"
            
            # Setup Event Handler untuk PrintPage
            $doc.add_PrintPage({{
                param($sender, $e)
                
                # Load gambar
                $img = [System.Drawing.Image]::FromFile("{}")
                
                # Dapatkan area printable (bukan PageBounds yang bisa melampaui area cetak)
                $printArea = $e.PageSettings.PrintableArea
                $hardMarginX = $e.PageSettings.HardMarginX
                $hardMarginY = $e.PageSettings.HardMarginY
                
                # Area yang benar-benar bisa diprint
                $destX = $printArea.X - $hardMarginX
                $destY = $printArea.Y - $hardMarginY
                $destWidth = $printArea.Width
                $destHeight = $printArea.Height
                
                # Cek orientasi gambar vs halaman
                $isImageLandscape = $img.Width -gt $img.Height
                $isPageLandscape = $destWidth -gt $destHeight
                
                # Auto Rotate jika orientasi tidak cocok
                if ($isImageLandscape -ne $isPageLandscape) {{
                     $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone)
                }}
                
                # Calculate scaling to fit while maintaining aspect ratio
                $imgWidth = $img.Width
                $imgHeight = $img.Height
                
                $scaleX = $destWidth / $imgWidth
                $scaleY = $destHeight / $imgHeight
                $scale = [Math]::Min($scaleX, $scaleY)
                
                $finalWidth = $imgWidth * $scale
                $finalHeight = $imgHeight * $scale
                
                # Center the image
                $finalX = $destX + (($destWidth - $finalWidth) / 2)
                $finalY = $destY + (($destHeight - $finalHeight) / 2)
                
                $destRect = New-Object System.Drawing.RectangleF($finalX, $finalY, $finalWidth, $finalHeight)
                
                # Draw the image
                $e.Graphics.DrawImage($img, $destRect)
                
                $img.Dispose()
            }})
            
            # Print (ke Default Printer)
            $doc.Print()
            "#,
            path_str
        );

        let output = std::process::Command::new("powershell")
            .args(&["-NoProfile", "-NonInteractive", "-Command", &ps_script])
            .output()
            .map_err(|e| e.to_string())?;
        
        if output.status.success() {
             Ok("Print command sent successfully via .NET".to_string())
        } else {
             let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
             println!("⚠️ PowerShell Print failed: {}", err_msg);
             Err(format!("Print failed: {}", err_msg))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Printing not supported on this OS".to_string())
    }
}



#[derive(Debug, Serialize)]
pub struct AbandonedSession {
    pub ticket_code: String,
    pub photo_count: usize,
    pub created_at: i64,
    pub photos: Vec<String>,
}

#[tauri::command]
fn get_abandoned_sessions() -> Result<Vec<AbandonedSession>, String> {
    let photos_dir = get_photos_dir();
    let mut sessions = Vec::new();
    
    if !photos_dir.exists() {
        return Ok(sessions);
    }
    
    if let Ok(entries) = std::fs::read_dir(&photos_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let ticket_code = entry.file_name().to_string_lossy().to_string();
                let has_hasil = entry.path().join("hasil_template.png").exists();
                
                if !has_hasil {
                    let mut photos = Vec::new();
                    if let Ok(sub_entries) = std::fs::read_dir(entry.path()) {
                        for sub_entry in sub_entries.flatten() {
                            let name = sub_entry.file_name().to_string_lossy().to_string();
                            if name.starts_with("photo_") && (name.ends_with(".png") || name.ends_with(".webp") || name.ends_with(".jpg")) {
                                photos.push(name);
                            }
                        }
                    }
                    
                    if photos.len() > 0 {
                        let created_at = entry.metadata()
                            .and_then(|m| m.created())
                            .ok()
                            .and_then(|c| c.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs() as i64)
                            .unwrap_or(0);
                        sessions.push(AbandonedSession {
                            ticket_code,
                            photo_count: photos.len(),
                            created_at,
                            photos,
                        });
                    }
                }
            }
        }
    }
    
    sessions.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(sessions)
}

// Public command to cleanup old photos
#[tauri::command]
fn cleanup_old_photos_cmd() -> Result<String, String> {
    let photos_dir = get_photos_dir();
    if !photos_dir.exists() {
        return Ok("Folder foto tidak ditemukan".to_string());
    }

    let today = Local::now().date_naive();
    let mut deleted_count = 0;

    if let Ok(entries) = fs::read_dir(&photos_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(created) = metadata.created() {
                        let created_date: chrono::DateTime<Local> = created.into();
                        if created_date.date_naive() < today {
                            println!("🗑️ Cleaning up old folder: {:?}", entry.path());
                            if fs::remove_dir_all(entry.path()).is_ok() {
                                deleted_count += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(format!("Berhasil menghapus {} folder foto lama", deleted_count))
}

// Generate Bottom Navigation Bar
fn generate_navbar(ticket_code: &str, active_page: &str) -> String {
    let active_capture = if active_page == "capture" { "active" } else { "" };
    let active_arrange = if active_page == "arrange" { "active" } else { "" };
    let active_gallery = if active_page == "gallery" { "active" } else { "" };

    format!(
        r#"
        <style>
            .bottom-nav {{
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #1a1512;
                border-top: 1px solid rgba(212, 175, 55, 0.3);
                display: flex;
                justify-content: space-around;
                padding: 10px 0;
                padding-bottom: max(10px, env(safe-area-inset-bottom));
                z-index: 999;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }}
            .nav-item {{
                color: rgba(255, 255, 255, 0.5);
                text-decoration: none;
                font-size: 0.75em;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                padding: 5px 15px;
                border-radius: 12px;
                transition: all 0.2s;
                min-width: 60px;
            }}
            .nav-item.active {{
                color: #d4af37;
                background: rgba(212, 175, 55, 0.15);
            }}
            .nav-icon {{
                font-size: 1.4em;
                margin-bottom: 2px;
            }}
            /* Body padding to prevent content from being hidden behind navbar */
            body {{
                padding-bottom: 90px !important;
            }}
        </style>
        <nav class="bottom-nav">
            <a href="/remote/{ticket_code}" class="nav-item {active_capture}">
                <span class="nav-icon">📷</span>
                <span>Foto</span>
            </a>
            <a href="/remote/{ticket_code}/arrange?force=true" class="nav-item {active_arrange}">
                <span class="nav-icon">🎨</span>
                <span>Atur</span>
            </a>
            <a href="/gallery/{ticket_code}" class="nav-item {active_gallery}">
                <span class="nav-icon">📥</span>
                <span>Galeri</span>
            </a>
        </nav>
        "#,
        ticket_code = ticket_code,
        active_capture = active_capture,
        active_arrange = active_arrange,
        active_gallery = active_gallery
    )
}

// Generate gallery HTML
fn generate_gallery_html(ticket_code: &str) -> String {
    let photos_dir = get_photos_dir();
    let ticket_dir = photos_dir.join(ticket_code);

    let mut photos = Vec::new();

    if ticket_dir.exists() {
        if let Ok(entries) = fs::read_dir(&ticket_dir) {
            for entry in entries.flatten() {
                let filename = entry.file_name().to_string_lossy().to_string();
                if filename.ends_with(".png") || filename.ends_with(".jpg") || filename.ends_with(".webp") {
                    photos.push(PhotoInfo {
                        filename: filename.clone(),
                        url: format!("/photos/{}/{}", ticket_code, filename),
                    });
                }
            }
        }
    }

    // Sort photos by filename
    photos.sort_by(|a, b| a.filename.cmp(&b.filename));

    let today = Local::now().format("%d %B %Y").to_string();

    format!(
        r#"<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rua Rasa Booth - {ticket_code}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1512 0%, #2d2420 100%);
            min-height: 100vh;
            color: white;
            padding: 20px;
        }}
        .container {{ max-width: 800px; margin: 0 auto; }}
        header {{
            text-align: center;
            padding: 30px 0;
            border-bottom: 1px solid rgba(212, 175, 55, 0.3);
            margin-bottom: 30px;
        }}
        h1 {{
            color: #d4af37;
            font-size: 2em;
            margin-bottom: 10px;
        }}
        .ticket-code {{
            background: rgba(212, 175, 55, 0.2);
            color: #d4af37;
            padding: 8px 20px;
            border-radius: 20px;
            display: inline-block;
            font-weight: bold;
            letter-spacing: 3px;
        }}
        .disclaimer {{
            background: rgba(255, 100, 100, 0.1);
            border: 1px solid rgba(255, 100, 100, 0.3);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 30px;
            text-align: center;
        }}
        .disclaimer strong {{ color: #ff6b6b; }}
        .gallery {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }}
        .photo-card {{
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            overflow: hidden;
            border: 1px solid rgba(212, 175, 55, 0.2);
            transition: transform 0.3s;
        }}
        .photo-card:hover {{ transform: scale(1.02); }}
        .photo-card img {{
            width: 100%;
            height: auto;
            display: block;
        }}
        .photo-card .info {{
            padding: 15px;
            text-align: center;
        }}
        .download-btn {{
            display: inline-block;
            background: linear-gradient(135deg, #d4af37, #c4a030);
            color: #1a1512;
            padding: 10px 20px;
            border-radius: 20px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 10px;
        }}
        .download-btn:hover {{ opacity: 0.9; }}
        .empty {{
            text-align: center;
            padding: 50px;
            color: rgba(255, 255, 255, 0.5);
        }}
        footer {{
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid rgba(212, 175, 55, 0.2);
            color: rgba(255, 255, 255, 0.5);
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎭 Rua Rasa Booth</h1>
            <p style="margin: 10px 0; opacity: 0.7;">{today}</p>
            <div class="ticket-code">{ticket_code}</div>
        </header>

        <div class="disclaimer">
            <strong>⚠️ Perhatian:</strong> Foto akan otomatis dihapus pada pukul 00:00 hari ini.
            <br>Silakan download sebelum waktu tersebut!
        </div>

        <div class="gallery">
            {photos_html}
        </div>

        {empty_message}

        <footer>
            <p>Terima kasih telah menggunakan Rua Rasa Booth!</p>
            <p style="margin-top: 5px;">© Rua Rasa Lombok Immersive Edupark</p>
        </footer>
    </div>
    {navbar}
</body>
</html>"#,
        ticket_code = ticket_code,
        today = today,
        navbar = generate_navbar(ticket_code, "gallery"),
        photos_html = photos
            .iter()
            .map(|p| format!(
                r#"<div class="photo-card">
                    <img src="{url}" alt="{filename}" loading="lazy">
                    <div class="info">
                        <p>{filename}</p>
                        <a href="{url}" download="{filename}" class="download-btn">📥 Download</a>
                    </div>
                </div>"#,
                url = p.url,
                filename = p.filename
            ))
            .collect::<Vec<_>>()
            .join("\n"),
        empty_message = if photos.is_empty() {
            r#"<div class="empty"><p>Belum ada foto untuk kode tiket ini.</p></div>"#
        } else {
            ""
        }
    )
}



// Generate Remote Arrange HTML page with functional photo positioning
fn generate_arrange_page(ticket_code: &str, photo_count: usize, sorted_filenames: &[String]) -> String {
    let sorted_json = serde_json::to_string(&sorted_filenames).unwrap_or("[]".to_string());
    format!(
        r#"<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>🎨 Atur Posisi - {ticket_code}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1512 0%, #2d2420 100%);
            min-height: 100vh;
            color: white;
            padding: 15px;
            touch-action: manipulation;
        }}
        .header {{
            text-align: center;
            margin-bottom: 15px;
        }}
        h1 {{
            color: #d4af37;
            font-size: 1.3em;
            margin-bottom: 5px;
        }}
        .subtitle {{
            color: rgba(255,255,255,0.6);
            font-size: 0.8em;
        }}
        .photo-grid {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            margin-bottom: 12px;
        }}
        .photo-card {{
            background: rgba(255,255,255,0.1);
            border: 2px solid transparent;
            border-radius: 8px;
            padding: 4px;
            cursor: pointer;
            transition: all 0.2s;
            aspect-ratio: 4/3;
            position: relative;
            overflow: hidden;
        }}
        .photo-card.active {{
            border-color: #d4af37;
            background: rgba(212, 175, 55, 0.4);
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
        }}
        .photo-card .label {{
            font-size: 2em;
            font-weight: bold;
            color: rgba(255,255,255,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
        }}
        .photo-card.active .label {{
            color: #d4af37;
        }}
        .controls {{
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
        }}
        .control-label {{
            color: rgba(255,255,255,0.7);
            font-size: 0.8em;
            margin-bottom: 8px;
            text-align: center;
        }}
        .arrow-grid {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            max-width: 160px;
            margin: 0 auto;
        }}
        .arrow-btn {{
            background: rgba(255,255,255,0.15);
            border: none;
            border-radius: 8px;
            padding: 10px;
            color: white;
            font-size: 1.2em;
            cursor: pointer;
            transition: all 0.1s;
        }}
        .arrow-btn:active {{
            background: #d4af37;
            transform: scale(0.95);
        }}
        .arrow-btn:disabled {{
            opacity: 0.3;
            cursor: not-allowed;
        }}
        .center-btn {{
            background: #d4af37;
            color: #1a1512;
            font-size: 0.8em;
        }}
        .status {{
            text-align: center;
            padding: 10px;
            border-radius: 10px;
            font-size: 0.85em;
            margin-top: 10px;
        }}
        .status.synced {{
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }}
        .status.syncing {{
            background: rgba(212, 175, 55, 0.2);
            color: #d4af37;
        }}
        .placeholder {{
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.3);
            font-size: 2em;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🎨 Atur Posisi Foto</h1>
        <p class="subtitle">Tap foto, geser & zoom</p>
    </div>

    <div class="photo-grid" id="photoGrid">
        <!-- Photos will be loaded here -->
    </div>

    <div class="controls">
        <p class="control-label">Foto <span id="selectedLabel">(pilih foto)</span></p>
        
        <!-- Arrow controls -->
        <div class="arrow-grid">
            <div></div>
            <button class="arrow-btn" id="upBtn" disabled onclick="move('up')">↑</button>
            <div></div>
            <button class="arrow-btn" id="leftBtn" disabled onclick="move('left')">←</button>
            <button class="arrow-btn center-btn" id="resetBtn" disabled onclick="resetAll()">⟲</button>
            <button class="arrow-btn" id="rightBtn" disabled onclick="move('right')">→</button>
            <div></div>
            <button class="arrow-btn" id="downBtn" disabled onclick="move('down')">↓</button>
            <div></div>
        </div>
        
        <!-- Zoom controls -->
        <div style="display: flex; justify-content: center; gap: 15px; margin-top: 15px;">
            <button class="arrow-btn" id="zoomOutBtn" disabled onclick="zoom(-0.1)" style="font-size: 1.2em;">🔍−</button>
            <span id="zoomLabel" style="color: rgba(255,255,255,0.7); display: flex; align-items: center;">Zoom: 100%</span>
            <button class="arrow-btn" id="zoomInBtn" disabled onclick="zoom(0.1)" style="font-size: 1.2em;">🔍+</button>
        </div>
        
        <div class="status synced" id="status">✓ Terhubung dengan booth</div>
    </div>

    {navbar}

    <script>
        const ticketCode = "{ticket_code}";
        const photoCount = {photo_count};
        let sortedFilenames = [];
        try {{
            sortedFilenames = JSON.parse('{sorted_json}');
        }} catch(e) {{
            console.error(e);
        }}

        let selectedIndex = null;
        // Offsets as ratio (-1.0 to 1.0) where 1.0 = max allowed offset
        let offsets = Array(photoCount).fill(null).map(() => ({{ x: 0, y: 0 }}));
        let scales = Array(photoCount).fill(1.0);
        const STEP = 0.1; // 10% of max offset per button press
        
        // Load photos
        async function loadPhotos() {{
            const grid = document.getElementById('photoGrid');
            grid.innerHTML = '';
            
            for (let i = 0; i < photoCount; i++) {{
                const card = document.createElement('div');
                card.className = 'photo-card';
                card.onclick = () => selectPhoto(i);
                
                const label = document.createElement('div');
                label.className = 'label';
                label.textContent = (i + 1);
                
                card.appendChild(label);
                grid.appendChild(card);
            }}
        }}
        
        function selectPhoto(index) {{
            selectedIndex = index;
            
            // Update UI
            document.querySelectorAll('.photo-card').forEach((c, i) => {{
                c.classList.toggle('active', i === index);
            }});
            
            document.getElementById('selectedLabel').textContent = `(Foto ${{index + 1}})`;
            document.getElementById('zoomLabel').textContent = `Zoom: ${{Math.round(scales[index] * 100)}}%`;
            
            // Enable all buttons
            ['upBtn', 'downBtn', 'leftBtn', 'rightBtn', 'resetBtn', 'zoomInBtn', 'zoomOutBtn'].forEach(id => {{
                document.getElementById(id).disabled = false;
            }});
            
            // Vibrate
            if (navigator.vibrate) navigator.vibrate(30);
        }}
        
        function move(direction) {{
            if (selectedIndex === null) return;
            
            const offset = offsets[selectedIndex];
            const scale = scales[selectedIndex];
            // Max ratio is 1.0 (full extent), but zoom allows more panning
            const maxRatio = 1.0;
            
            switch(direction) {{
                case 'up': offset.y = Math.max(-maxRatio, offset.y - STEP); break;
                case 'down': offset.y = Math.min(maxRatio, offset.y + STEP); break;
                case 'left': offset.x = Math.max(-maxRatio, offset.x - STEP); break;
                case 'right': offset.x = Math.min(maxRatio, offset.x + STEP); break;
            }}
            
            syncOffset();
            if (navigator.vibrate) navigator.vibrate(20);
        }}
        
        function zoom(delta) {{
            if (selectedIndex === null) return;
            
            // Clamp scale between 1.0 and 2.0
            scales[selectedIndex] = Math.max(1.0, Math.min(2.0, scales[selectedIndex] + delta));
            document.getElementById('zoomLabel').textContent = `Zoom: ${{Math.round(scales[selectedIndex] * 100)}}%`;
            
            syncOffset();
            if (navigator.vibrate) navigator.vibrate(20);
        }}
        
        function resetAll() {{
            if (selectedIndex === null) return;
            offsets[selectedIndex] = {{ x: 0, y: 0 }};
            scales[selectedIndex] = 1.0;
            document.getElementById('zoomLabel').textContent = 'Zoom: 100%';
            syncOffset();
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
        }}
        
        async function syncOffset() {{
            const status = document.getElementById('status');
            status.className = 'status syncing';
            status.textContent = '⟳ Menyinkronkan...';
            
            try {{
                await fetch('/arrange/offset', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{
                        ticket_code: ticketCode,
                        photo_index: selectedIndex,
                        x_ratio: offsets[selectedIndex].x,
                        y_ratio: offsets[selectedIndex].y,
                        scale: scales[selectedIndex]
                    }})
                }});
                
                status.className = 'status synced';
                status.textContent = '✓ Tersinkron dengan booth';
            }} catch (e) {{
                status.className = 'status';
                status.style.background = 'rgba(239, 68, 68, 0.2)';
                status.style.color = '#ef4444';
                status.textContent = '✕ Gagal sinkronisasi';
            }}
        }}
        
        // Poll for step changes
        async function pollStep() {{
            try {{
                const response = await fetch(`/session/step/${{ticketCode}}`);
                const result = await response.json();
                if (result.success) {{
                    if (result.step === 'capture') {{
                        window.location.href = `/remote/${{ticketCode}}`;
                    }} else if (result.step === 'result' || result.step === 'done') {{
                        document.querySelector('.header h1').textContent = '✅ Selesai!';
                        document.querySelector('.subtitle').textContent = 'Foto sedang diproses...';
                    }}
                }}
            }} catch (e) {{ }}
        }}
        
        // Initialize
        loadPhotos();
        setInterval(pollStep, 2000);
    </script>
    {navbar}
</body>
</html>"#,
        ticket_code = ticket_code,
        photo_count = photo_count,
        navbar = generate_navbar(ticket_code, "arrange")
    )
}

// Generate Remote Control HTML page
fn generate_remote_html(ticket_code: &str, state: &CameraState) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>📸 Remote Capture - {ticket_code}</title>
    <script>
        window.initialState = {{
            flip_h: {flip_h},
            flip_v: {flip_v},
            is_portrait: {is_portrait}
        }};
    </script>
    <style>
"#,
        ticket_code = ticket_code,
        flip_h = state.flip_h,
        flip_v = state.flip_v,
        is_portrait = state.is_portrait
    ) + &format!(r#"
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1512 0%, #2d2420 100%);
            min-height: 100vh;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            touch-action: manipulation;
        }}
        .container {{
            text-align: center;
            max-width: 400px;
            width: 100%;
        }}
        .logo {{
            font-size: 3em;
            margin-bottom: 10px;
        }}
        h1 {{
            color: #d4af37;
            font-size: 1.5em;
            margin-bottom: 20px;
        }}
        .ticket-code {{
            background: rgba(212, 175, 55, 0.2);
            color: #d4af37;
            padding: 10px 25px;
            border-radius: 25px;
            display: inline-block;
            font-weight: bold;
            letter-spacing: 4px;
            font-size: 1.2em;
            margin-bottom: 40px;
        }}
        .capture-btn {{
            width: 180px;
            height: 180px;
            border-radius: 50%;
            border: 8px solid rgba(255, 255, 255, 0.3);
            background: linear-gradient(145deg, #ffffff, #e0e0e0);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4em;
            transition: all 0.2s ease;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            margin: 0 auto 30px;
            -webkit-tap-highlight-color: transparent;
        }}
        .capture-btn:active {{
            transform: scale(0.95);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        }}
        .capture-btn.success {{
            background: linear-gradient(145deg, #4ade80, #22c55e);
            border-color: rgba(74, 222, 128, 0.5);
        }}
        .capture-btn.error {{
            background: linear-gradient(145deg, #ef4444, #dc2626);
            border-color: rgba(239, 68, 68, 0.5);
        }}
        .status {{
            font-size: 1.1em;
            color: rgba(255, 255, 255, 0.7);
            min-height: 30px;
        }}
        .status.success {{ color: #4ade80; }}
        .status.error {{ color: #ef4444; }}
        .instructions {{
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 20px;
            margin-top: 30px;
            text-align: left;
            font-size: 0.9em;
            color: rgba(255, 255, 255, 0.6);
        }}
        .instructions h3 {{
            color: #d4af37;
            margin-bottom: 10px;
        }}
        .instructions ul {{
            padding-left: 20px;
        }}
        .instructions li {{
            margin-bottom: 5px;
        }}
        .nav-btn {{
            display: block;
            background: rgba(255, 255, 255, 0.1);
            color: #d4af37;
            padding: 15px;
            border-radius: 15px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
            border: 1px solid rgba(212, 175, 55, 0.3);
            transition: all 0.2s;
        }}
        .nav-btn:active {{
            background: rgba(212, 175, 55, 0.2);
            transform: scale(0.98);
        }}
        /* Countdown Overlay */
        .countdown-overlay {{
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }}
        .countdown-number {{
            font-size: 10em;
            font-weight: bold;
            color: #d4af37;
            text-shadow: 0 0 50px rgba(212, 175, 55, 0.5);
            animation: pulse 1s ease-in-out;
        }}
        .countdown-text {{
            font-size: 1.5em;
            color: white;
            margin-top: 20px;
        }}
        @keyframes pulse {{
            0% {{ transform: scale(0.5); opacity: 0; }}
            50% {{ transform: scale(1.2); }}
            100% {{ transform: scale(1); opacity: 1; }}
        }}
        .flash {{
            animation: flash 0.3s ease-out;
        }}
        @keyframes flash {{
            0% {{ background: white; }}
            100% {{ background: rgba(0, 0, 0, 0.9); }}
        }}
        /* Flip Buttons */
        .flip-container {{
            display: flex;
            gap: 10px;
            margin-top: 20px;
            width: 100%;
            justify-content: center;
        }}
        .flip-btn {{
            flex: 1;
            max-width: 80px;
            height: 70px;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.1);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;
            color: white;
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
        }}
        .flip-btn:active {{
            transform: scale(0.95);
        }}
        .flip-btn.active {{
            background: #d4af37;
            border-color: #d4af37;
            color: #1a1512;
        }}
        .flip-btn span {{
            font-size: 0.4em;
            margin-top: 5px;
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">📸</div>
        <h1>Remote Capture</h1>
        <div class="ticket-code">{ticket_code}</div>
        
        <button class="capture-btn" id="captureBtn" onclick="triggerCapture()">
            📷
        </button>
        
        <div class="status" id="status">Tap tombol untuk capture</div>
        
        <!-- Flip Buttons -->
        <div class="flip-container">
            <button class="flip-btn" id="flipHBtn" onclick="toggleFlip('flip_h')">
                ↔️
                <span>Flip H</span>
            </button>
            <button class="flip-btn" id="flipVBtn" onclick="toggleFlip('flip_v')">
                ↕️
                <span>Flip V</span>
            </button>
            <button class="flip-btn" id="portraitBtn" onclick="toggleFlip('toggle_portrait')">
                📱
                <span>9:16</span>
            </button>
        </div>
        
        <div class="instructions">
            <h3>Cara Penggunaan:</h3>
            <ul>
                <li>Posisikan diri di depan kamera booth</li>
                <li>Tap tombol besar untuk memulai countdown</li>
                <li>Tunggu 3 detik, lalu tersenyum! 😊</li>
                <li>Gunakan Flip H/V jika tampilan terbalik</li>
            </ul>
            </ul>
        </div>

        <!-- <a href="/remote/{ticket_code}/arrange?force=true" class="nav-btn">
            ➡️ Manual: Lanjut ke Atur Posisi (Bypass)
        </a> -->
    </div>
    
    <!-- Countdown Overlay (hidden by default) -->
    <div class="countdown-overlay" id="countdownOverlay" style="display: none;">
        <div class="countdown-number" id="countdownNumber">3</div>
        <div class="countdown-text" id="countdownText">Bersiap...</div>
    </div>
    

    
    <script>
        const ticketCode = "{ticket_code}";
        const captureBtn = document.getElementById('captureBtn');
        const status = document.getElementById('status');
        const countdownOverlay = document.getElementById('countdownOverlay');
        const countdownNumber = document.getElementById('countdownNumber');
        const countdownText = document.getElementById('countdownText');
        
        // Initialize UI from state
        if (window.initialState) {{
            const {{ flip_h, flip_v, is_portrait }} = window.initialState;
            if (flip_h) document.getElementById('flipHBtn').classList.add('active');
            if (flip_v) document.getElementById('flipVBtn').classList.add('active');
            if (is_portrait) document.getElementById('portraitBtn').classList.add('active');
        }}

        // Poll state from server to sync UI (for changes made from Booth)
        async function pollState() {{
            try {{
                const response = await fetch(`/remote/state/${{ticketCode}}`);
                const result = await response.json();
                if (result.success && result.state) {{
                    const {{ flip_h, flip_v, is_portrait }} = result.state;
                    
                    // Update button states
                    const flipHBtn = document.getElementById('flipHBtn');
                    const flipVBtn = document.getElementById('flipVBtn');
                    const portraitBtn = document.getElementById('portraitBtn');
                    
                    flipHBtn.classList.toggle('active', flip_h);
                    flipVBtn.classList.toggle('active', flip_v);
                    portraitBtn.classList.toggle('active', is_portrait);
                }}
            }} catch (e) {{
                // Silent fail - just retry next interval
            }}
        }}
        
        // Poll for step changes (redirect if booth moves to arrange)
        async function pollStep() {{
            try {{
                const response = await fetch(`/session/step/${{ticketCode}}`);
                const result = await response.json();
                if (result.success && result.step === 'arrange') {{
                    // Redirect to arrange page
                    window.location.href = `/remote/${{ticketCode}}/arrange`;
                }}
            }} catch (e) {{
                // Silent fail
            }}
        }}
        
        // Poll every 2 seconds
        setInterval(pollState, 2000);
        setInterval(pollStep, 2000);

        let isProcessing = false;
        
        function showCountdown() {{
            countdownOverlay.style.display = 'flex';
            let count = 3;
            countdownNumber.textContent = count;
            countdownText.textContent = 'Bersiap...';
            
            // Vibrate pattern for countdown
            if (navigator.vibrate) {{
                navigator.vibrate([100, 200, 100, 200, 100, 200, 500]);
            }}
            
            const countdownInterval = setInterval(() => {{
                count--;
                if (count > 0) {{
                    countdownNumber.textContent = count;
                    countdownNumber.style.animation = 'none';
                    setTimeout(() => countdownNumber.style.animation = 'pulse 1s ease-in-out', 10);
                }} else if (count === 0) {{
                    countdownNumber.textContent = '📸';
                    countdownText.textContent = 'CHEESE!';
                    countdownOverlay.classList.add('flash');
                    
                    // Strong vibrate on capture
                    if (navigator.vibrate) {{
                        navigator.vibrate(300);
                    }}
                }} else {{
                    clearInterval(countdownInterval);
                    countdownOverlay.style.display = 'none';
                    countdownOverlay.classList.remove('flash');
                    
                    // Reset for next capture
                    captureBtn.innerHTML = '📷';
                    captureBtn.classList.remove('success', 'error');
                    status.textContent = 'Foto diambil! Tap lagi untuk foto berikutnya';
                    status.className = 'status success';
                    isProcessing = false;
                }}
            }}, 1000);
        }}
        
        async function triggerCapture() {{
            if (isProcessing) return;
            
            isProcessing = true;
            captureBtn.innerHTML = '⏳';
            status.textContent = 'Mengirim perintah...';
            status.className = 'status';
            
            try {{
                const response = await fetch('/remote/capture', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                    }},
                    body: JSON.stringify({{
                        ticket_code: ticketCode,
                        action: 'capture'
                    }})
                }});
                
                const result = await response.json();
                
                if (result.success) {{
                    captureBtn.innerHTML = '✅';
                    captureBtn.classList.remove('error');
                    captureBtn.classList.add('success');
                    status.textContent = 'Countdown dimulai!';
                    status.className = 'status success';
                    
                    // Show countdown overlay
                    showCountdown();
                }} else {{
                    throw new Error(result.message);
                }}
            }} catch (error) {{
                captureBtn.innerHTML = '❌';
                captureBtn.classList.remove('success');
                captureBtn.classList.add('error');
                status.textContent = 'Gagal: ' + error.message;
                status.className = 'status error';
                
                // Reset button after 2 seconds on error
                setTimeout(() => {{
                    captureBtn.innerHTML = '📷';
                    captureBtn.classList.remove('success', 'error');
                    status.textContent = 'Tap tombol untuk capture';
                    status.className = 'status';
                    isProcessing = false;
                }}, 2000);
            }}
        }}
        
        // Toggle Flip function
        async function toggleFlip(action) {{
            let btn;
            if (action === 'flip_h') btn = document.getElementById('flipHBtn');
            else if (action === 'flip_v') btn = document.getElementById('flipVBtn');
            else btn = document.getElementById('portraitBtn');
            
            try {{
                const response = await fetch('/remote/capture', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                    }},
                    body: JSON.stringify({{
                        ticket_code: ticketCode,
                        action: action
                    }})
                }});
                
                const result = await response.json();
                
                if (result.success) {{
                    // Toggle active state
                    btn.classList.toggle('active');
                    
                    // Vibrate feedback
                    if (navigator.vibrate) {{
                        navigator.vibrate(50);
                    }}
                    
                    // Show status briefly
                    let statusText = '';
                    if (action === 'flip_h') statusText = `Flip Horizontal ${{btn.classList.contains('active') ? 'ON' : 'OFF'}}`;
                    else if (action === 'flip_v') statusText = `Flip Vertical ${{btn.classList.contains('active') ? 'ON' : 'OFF'}}`;
                    else statusText = `Mode ${{btn.classList.contains('active') ? 'Portrait (9:16)' : 'Landscape (16:9)'}}`;
                    
                    status.textContent = statusText;
                    status.className = 'status success';
                    
                    setTimeout(() => {{
                        status.textContent = 'Tap tombol untuk capture';
                        status.className = 'status';
                    }}, 1500);
                }}
            }} catch (error) {{
                console.error('Flip error:', error);
            }}
        }}
    </script>
    {navbar}
</body>
</html>"#,
        ticket_code = ticket_code,
        navbar = generate_navbar(ticket_code, "capture")
    )
}

// Start the HTTP server
fn start_http_server(app_handle: AppHandle) {
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async move {
            let photos_dir = get_photos_dir();
            
            // Global Camera State Storage
            let camera_states: Arc<Mutex<HashMap<String, CameraState>>> = Arc::new(Mutex::new(HashMap::new()));
            
            // Active Ticket Code (only this ticket can control the booth)
            let active_ticket: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
            
            // Session State Storage (step, photos, etc. for remote sync)
            let session_states: Arc<Mutex<HashMap<String, SessionState>>> = Arc::new(Mutex::new(HashMap::new()));
            
            // Clone app_handle for use in closure
            let app_handle_clone = app_handle.clone();
            let app_handle_xendit = app_handle.clone();

            // POST /webhook/payment - Receive payment confirmation
            let payment_webhook = warp::path!("webhook" / "payment")
                .and(warp::post())
                .and(warp::body::json())
                .map(move |payload: PaymentConfirmation| {
                    println!("Received payment confirmation: {:?}", payload);
                    
                    // Emit event to frontend
                    if let Err(e) = app_handle_clone.emit("payment-confirmed", payload.clone()) {
                        eprintln!("Failed to emit payment event: {}", e);
                    } else {
                        println!("Payment event emitted to frontend for ticket: {}", payload.ticket_code);
                    }
                    
                    warp::reply::json(&WebhookResponse {
                        success: true,
                        message: format!("Payment confirmed for ticket: {}", payload.ticket_code),
                        state: None,
                    })
                });

            // POST /webhook/xendit-qris - Receive Xendit QRIS webhook
            let xendit_webhook = warp::path!("webhook" / "xendit-qris")
                .and(warp::post())
                .and(warp::body::json())
                .map(move |payload: serde_json::Value| {
                    println!("Received Xendit webhook: {:?}", payload);
                    
                    let status = payload.get("data").and_then(|d| d.get("status")).and_then(|s| s.as_str()).unwrap_or("");
                    
                    if status == "SUCCEEDED" || status == "COMPLETED" {
                        let amount = payload.get("data").and_then(|d| d.get("amount")).and_then(|a| a.as_f64()).unwrap_or(0.0) as i32;
                        
                        let confirm_payload = PaymentConfirmation {
                            ticket_code: "*".to_string(),
                            amount: Some(amount),
                            cashier_id: Some("XENDIT-QRIS".to_string()),
                        };
                        
                        if let Err(e) = app_handle_xendit.emit("payment-confirmed", confirm_payload) {
                            eprintln!("Failed to emit Xendit payment event: {}", e);
                        } else {
                            println!("Xendit QRIS Payment event emitted to frontend with wildcard ticket_code");
                        }

                        // Send to external API (Rua Rasa Backend)
                        let api_payload = payload.clone();
                        tauri::async_runtime::spawn(async move {
                            println!("🚀 Forwarding Xendit webhook to Rua Rasa API...");
                            let client = reqwest::Client::new();
                            match client.post("https://cafe.ruarasa.com/api/photo-booth/order")
                                .json(&api_payload)
                                .send()
                                .await 
                            {
                                Ok(res) => println!("✅ Rua Rasa API success: {}", res.status()),
                                Err(e) => eprintln!("❌ Rua Rasa API failed: {}", e),
                            }
                        });
                    } else {
                        println!("Ignored Xendit webhook with status: {}", status);
                    }
                    
                    warp::reply::json(&WebhookResponse {
                        success: true,
                        message: "Xendit webhook processed".to_string(),
                        state: None,
                    })
                });

            // GET / - Health check (Root)
            let health = warp::path::end().and(warp::get()).map(|| {
                warp::reply::json(&WebhookResponse {
                    success: true,
                    message: "Rua Rasa Booth Server is running".to_string(),
                    state: None,
                })
            });

            // GET /gallery/:ticket_code - Gallery page
            let gallery = warp::path!("gallery" / String)
                .and(warp::get())
                .map(|ticket_code: String| {
                    let html = generate_gallery_html(&ticket_code);
                    warp::reply::html(html)
                });

            // GET /photos/:ticket_code/:filename - Serve photo files
            let photos = warp::path("photos").and(warp::fs::dir(photos_dir));

            // Clone handles for remote capture
            let app_handle_remote = app_handle.clone();
            let camera_states_remote = camera_states.clone();
            let camera_states_page = camera_states.clone();
            let camera_states_sync = camera_states.clone();
            let camera_states_poll = camera_states.clone();
            let active_ticket_sync = active_ticket.clone();
            let active_ticket_remote = active_ticket.clone();

            let session_states_sync = session_states.clone();
            let session_states_poll = session_states.clone();

            // GET /remote/state/:ticket_code - Poll current state (for syncing remote UI)
            let remote_state = warp::path!("remote" / "state" / String)
                .and(warp::get())
                .map(move |ticket_code: String| {
                    let state = {
                        let states = camera_states_poll.lock().unwrap();
                        states.get(&ticket_code).cloned().unwrap_or_default()
                    };
                    warp::reply::json(&WebhookResponse {
                        success: true,
                        message: "State fetched".to_string(),
                        state: Some(state),
                    })
                });

            // GET /session/step/:ticket_code - Poll current session step
            let session_step = warp::path!("session" / "step" / String)
                .and(warp::get())
                .map(move |ticket_code: String| {
                    let session = {
                        let sessions = session_states_poll.lock().unwrap();
                        sessions.get(&ticket_code).cloned().unwrap_or_default()
                    };
                    warp::reply::json(&serde_json::json!({
                        "success": true,
                        "step": session.current_step,
                        "photo_count": session.photo_count,
                    }))
                });

            // POST /booth/sync - Sync state from Booth
            let booth_sync = warp::path!("booth" / "sync")
                .and(warp::post())
                .and(warp::body::json())
                .map(move |payload: RemoteCaptureCommand| {
                    // Set this ticket as active
                    {
                        let mut active = active_ticket_sync.lock().unwrap();
                        *active = Some(payload.ticket_code.clone());
                    }
                    
                    if let Some(state) = payload.state {
                        let mut states = camera_states_sync.lock().unwrap();
                        states.insert(payload.ticket_code.clone(), state);
                        println!("🔄 Synced state for ticket: {} (now active)", payload.ticket_code);
                    }
                    warp::reply::json(&WebhookResponse {
                        success: true,
                        message: "State synced".to_string(),
                        state: None,
                    })
                });

            // POST /booth/step - Sync current step from Booth
            let booth_step = warp::path!("booth" / "step")
                .and(warp::post())
                .and(warp::body::json())
                .map(move |payload: serde_json::Value| {
                    let ticket_code = payload.get("ticket_code").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let step = payload.get("step").and_then(|v| v.as_str()).unwrap_or("capture").to_string();
                    let photo_count = payload.get("photo_count").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                    
                    let mut sorted_files = Vec::new();
                    if let Some(files) = payload.get("sorted_filenames").and_then(|v| v.as_array()) {
                        for f in files {
                            if let Some(name) = f.as_str() {
                                sorted_files.push(name.to_string());
                            }
                        }
                    }

                    {
                        let mut sessions = session_states_sync.lock().unwrap();
                        let session = sessions.entry(ticket_code.clone()).or_insert_with(SessionState::default);
                        session.current_step = step.clone();
                        session.photo_count = photo_count;
                        // Only update if provided, otherwise keep existing
                        if !sorted_files.is_empty() {
                            session.sorted_filenames = sorted_files.clone();
                        }
                    }
                    
                    println!("📍 Session step synced: {} -> {} (photos: {})", ticket_code, step, photo_count);
                    if !sorted_files.is_empty() {
                        println!("📋 Sorted: {:?}", sorted_files);
                    }
                    
                    warp::reply::json(&serde_json::json!({
                        "success": true,
                    }))
                });

            // Clone app_handle for arrange offset
            let app_handle_arrange = app_handle.clone();

            // POST /arrange/offset - Receive offset from remote phone
            let arrange_offset = warp::path!("arrange" / "offset")
                .and(warp::post())
                .and(warp::body::json())
                .map(move |payload: serde_json::Value| {
                    let ticket_code = payload.get("ticket_code").and_then(|v| v.as_str()).unwrap_or("");
                    let photo_index = payload.get("photo_index").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                    // x_ratio and y_ratio are floats from -1.0 to 1.0
                    let x_ratio = payload.get("x_ratio").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let y_ratio = payload.get("y_ratio").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let scale = payload.get("scale").and_then(|v| v.as_f64()).unwrap_or(1.0);
                    
                    println!("📐 Remote offset: photo {} -> ratio({:.2}, {:.2}) scale: {:.1}", photo_index, x_ratio, y_ratio, scale);
                    
                    // Emit event to frontend with ratio values
                    let _ = app_handle_arrange.emit("remote-arrange-offset", serde_json::json!({
                        "ticket_code": ticket_code,
                        "photo_index": photo_index,
                        "x_ratio": x_ratio,
                        "y_ratio": y_ratio,
                        "scale": scale
                    }));
                    
                    warp::reply::json(&serde_json::json!({
                        "success": true,
                        "message": "Offset received"
                    }))
                });

            // POST /remote/capture - Remote capture trigger from phone
            let remote_capture = warp::path!("remote" / "capture")
                .and(warp::post())
                .and(warp::body::json())
                .map(move |payload: RemoteCaptureCommand| {
                    println!("📱 Remote command: {:?} Action: {}", payload.ticket_code, payload.action);
                    
                    // Validate that this ticket is the active one
                    {
                        let active = active_ticket_remote.lock().unwrap();
                        if let Some(ref active_code) = *active {
                            if active_code != &payload.ticket_code {
                                println!("❌ Rejected: Ticket {} is not active (active: {})", payload.ticket_code, active_code);
                                return warp::reply::json(&WebhookResponse {
                                    success: false,
                                    message: "Sesi ini tidak aktif. Pastikan tiket Anda sedang digunakan di booth.".to_string(),
                                    state: None,
                                });
                            }
                        } else {
                            println!("❌ Rejected: No active session");
                            return warp::reply::json(&WebhookResponse {
                                success: false,
                                message: "Tidak ada sesi aktif di booth. Silakan mulai sesi terlebih dahulu.".to_string(),
                                state: None,
                            });
                        }
                    }
                    
                    let mut current_state = {
                        let mut states = camera_states_remote.lock().unwrap();
                        states.entry(payload.ticket_code.clone()).or_default().clone()
                    };

                    // Update state based on action
                    let mut needs_update = true;
                    match payload.action.as_str() {
                        "flip_h" => current_state.flip_h = !current_state.flip_h,
                        "flip_v" => current_state.flip_v = !current_state.flip_v,
                        "toggle_portrait" => current_state.is_portrait = !current_state.is_portrait,
                        "capture" => needs_update = false,
                        _ => needs_update = false,
                    }

                    // Save updated state
                    if needs_update {
                         let mut states = camera_states_remote.lock().unwrap();
                         states.insert(payload.ticket_code.clone(), current_state.clone());
                    }

                    // Prepare payload for Booth (Action + New State)
                    let emit_payload = RemoteCaptureCommand {
                        ticket_code: payload.ticket_code.clone(),
                        action: payload.action.clone(),
                        state: Some(current_state.clone()),
                    };
                    
                    // Emit event to frontend
                    if let Err(e) = app_handle_remote.emit("remote-capture", emit_payload) {
                        eprintln!("Failed to emit remote capture event: {}", e);
                        return warp::reply::json(&WebhookResponse {
                            success: false,
                            message: format!("Failed to trigger capture: {}", e),
                            state: None,
                        });
                    }
                    
                    warp::reply::json(&WebhookResponse {
                        success: true,
                        message: "Success".to_string(),
                        state: Some(current_state),
                    })
                });

            // Clone for arrange page
            let session_states_arrange = session_states.clone();

            // GET /remote/:ticket_code/arrange - Remote arrange page
            let remote_arrange_page = warp::path!("remote" / String / "arrange")
                .and(warp::get())
                .and(warp::query::<HashMap<String, String>>())
                .map(move |ticket_code: String, params: HashMap<String, String>| {
                    let (mut photo_count, current_step, sorted_filenames) = {
                        let sessions = session_states_arrange.lock().unwrap();
                        if let Some(s) = sessions.get(&ticket_code) {
                            (s.photo_count, s.current_step.clone(), s.sorted_filenames.clone())
                        } else {
                            (0, "capture".to_string(), Vec::new())
                        }
                    };

                    // Check disk for actual photos (Session state might be lagging)
                    let photos_dir = get_photos_dir().join(&ticket_code);
                    if let Ok(entries) = std::fs::read_dir(photos_dir) {
                         let disk_count = entries.flatten()
                             .filter(|e| {
                                 let name = e.file_name().to_string_lossy().to_string();
                                 // Filter for standard image files, exclude result/temp files if any
                                 (name.ends_with(".jpg") || name.ends_with(".png")) && !name.starts_with("hasil_")
                             })
                             .count();
                         
                         // Use the larger number (disk files usually source of truth)
                         if disk_count > photo_count {
                             photo_count = disk_count;
                         }
                    }

                    let force = params.get("force").map(|v| v == "true").unwrap_or(false);

                    // Only allow access if in 'arrange' step OR forced
                    if current_step != "arrange" && !force {
                        let html = format!(
                            r#"<!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="utf-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1">
                                <meta http-equiv="refresh" content="2; url=/remote/{}" />
                                <style>
                                    body {{ background: #1a1512; color: #d4af37; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 20px; }}
                                </style>
                            </head>
                            <body>
                                <div>
                                    <h3>⏳ Belum Waktunya</h3>
                                    <p>Fitur Atur Posisi hanya tersedia di Step 06.</p>
                                    <p style="font-size: 0.8em; opacity: 0.7;">Mengalihkan kembali...</p>
                                </div>
                            </body>
                            </html>"#,
                            ticket_code
                        );
                        return warp::reply::with_header(
                            warp::reply::html(html),
                            "Cache-Control",
                            "no-store, no-cache, must-revalidate",
                        );
                    }

                    let html = generate_arrange_page(&ticket_code, photo_count, &sorted_filenames);
                    // Add no-store to prevent stale order
                    warp::reply::with_header(
                        warp::reply::html(html),
                        "Cache-Control",
                        "no-store, no-cache, must-revalidate",
                    )
                });

            // GET /remote/:ticket_code - Remote control page
            let remote_page = warp::path!("remote" / String)
                .and(warp::get())
                .map(move |ticket_code: String| {
                    // User Request: Always show capture page, bypass inactive check
                    
                    let state = {
                        let states = camera_states_page.lock().unwrap();
                        states.get(&ticket_code).cloned().unwrap_or_default()
                    };
                    let html = generate_remote_html(&ticket_code, &state);
                    warp::reply::html(html)
                });

            // CORS
            let cors = warp::cors()
                .allow_any_origin()
                .allow_methods(vec!["GET", "POST", "OPTIONS"])
                .allow_headers(vec!["Content-Type", "Authorization"]);

            let routes = payment_webhook
                .or(xendit_webhook)
                .or(health)
                .or(gallery)
                .or(photos)
                .or(remote_capture)
                .or(remote_state)
                .or(session_step)
                .or(booth_step)
                .or(arrange_offset)
                .or(remote_arrange_page)
                .or(remote_page)
                .or(booth_sync)
                .with(cors);

            let ip = get_local_ip();
            println!("🚀 Server starting on http://{}:3847", ip);
            println!("📁 Photos directory: {:?}", get_photos_dir());

            // Cleanup old photos on startup (Disabled per user request - use Admin Panel for manual cleanup)
            // cleanup_old_photos();


            warp::serve(routes).run(([0, 0, 0, 0], 3847)).await;
        });
    });
}

// ============ DATABASE COMMANDS ============

// Get a setting from database
#[tauri::command]
fn db_get_setting(key: String) -> Option<String> {
    get_database().get_setting(&key)
}

// Set a setting in database
#[tauri::command]
fn db_set_setting(key: String, value: String) -> Result<String, String> {
    get_database()
        .set_setting(&key, &value)
        .map_err(|e| e.to_string())?;
    println!("💾 Setting saved: {} = {}", key, value);
    Ok("Setting saved".to_string())
}

// Get all settings from database
#[tauri::command]
fn db_get_all_settings() -> Result<Vec<Setting>, String> {
    get_database()
        .get_all_settings()
        .map_err(|e| e.to_string())
}

// Delete a setting
#[tauri::command]
fn db_delete_setting(key: String) -> Result<bool, String> {
    get_database()
        .delete_setting(&key)
        .map_err(|e| e.to_string())
}

// Log a session
#[tauri::command]
fn db_log_session(
    ticket_code: String,
    template_name: Option<String>,
    background_name: Option<String>,
    filter_name: Option<String>,
    photo_count: i32,
    printed: bool,
    session_price: i32,
    session_duration: i32,
    actual_duration: i32,
) -> Result<i64, String> {
    get_database()
        .log_session(
            &ticket_code,
            template_name.as_deref(),
            background_name.as_deref(),
            filter_name.as_deref(),
            photo_count,
            printed,
            session_price,
            session_duration,
            actual_duration,
        )
        .map_err(|e| e.to_string())
}

// Get today's sessions
#[tauri::command]
fn db_get_today_sessions() -> Result<Vec<SessionLog>, String> {
    get_database()
        .get_today_sessions()
        .map_err(|e| e.to_string())
}

// Get today's stats
#[tauri::command]
fn db_get_today_stats() -> Result<(i32, i32, i32), String> {
    get_database()
        .get_today_stats()
        .map_err(|e| e.to_string())
}

// Mark session as printed
#[tauri::command]
fn db_mark_session_printed(ticket_code: String) -> Result<bool, String> {
    get_database()
        .mark_session_printed(&ticket_code)
        .map_err(|e| e.to_string())
}

// Get all sessions (export)
#[tauri::command]
fn db_get_all_sessions() -> Result<Vec<SessionLog>, String> {
    get_database()
        .get_all_sessions()
        .map_err(|e| e.to_string())
}

// Clear all sessions
#[tauri::command]
fn db_clear_all_sessions() -> Result<bool, String> {
    get_database()
        .clear_all_sessions()
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database on startup
    let _ = get_database();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            save_photo,
            get_gallery_url,
            delete_photos_by_date,
            cleanup_old_photos_cmd,
            print_ticket_result,
            // Database commands
            db_get_setting,
            db_set_setting,
            db_get_all_settings,
            db_delete_setting,
            db_log_session,
            db_get_today_sessions,
            db_get_today_stats,
            create_xendit_qr,
            db_mark_session_printed,
            db_get_all_sessions,
            db_clear_all_sessions,
            db_get_today_stats,
            db_mark_session_printed,
            // System commands
            exit_app,
            get_abandoned_sessions
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            start_http_server(app_handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
