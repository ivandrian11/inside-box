mod database;

use base64::{engine::general_purpose::STANDARD, Engine};
use chrono::Local;
use serde::{Deserialize, Serialize};
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
#[derive(Debug, Serialize, Deserialize, Clone)]
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
async fn create_xendit_qr(ticket_code: String, amount: i32) -> Result<XenditQrResponse, String> {
    let db = get_database();
    
    // 1. Get Settings
    let secret_key = db.get_setting("xendit_secret_key").ok_or("Xendit Secret Key not set")?;

    println!("🔐 Creating Xendit QR for amount {} (Ticket: {}) via polling", amount, ticket_code);
    
    // 2. Prepare Request
    let client = reqwest::Client::new();
    let body = XenditQrRequest {
        reference_id: ticket_code,
        qr_type: "DYNAMIC".to_string(),
        currency: "IDR".to_string(),
        amount: amount as f64,
        callback_url: None, // No callback URL required for polling
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
    
    let resp_json: XenditQrResponse = response.json().await.map_err(|e| format!("Invalid JSON: {}", e))?;
    Ok(resp_json)
}

#[tauri::command]
async fn check_xendit_qr_status(qr_id: String) -> Result<String, String> {
    let db = get_database();
    let secret_key = db.get_setting("xendit_secret_key").ok_or("Xendit Secret Key not set")?;

    let client = reqwest::Client::new();
    let response = client.get(format!("https://api.xendit.co/qr_codes/{}/payments", qr_id))
        .basic_auth(secret_key, Some(""))
        .header("api-version", "2022-07-31")
        .send()
        .await
        .map_err(|e| format!("Xendit Status Request Failed: {}", e))?;

    if !response.status().is_success() {
        let err_text = response.text().await.unwrap_or_default();
        println!("❌ Xendit Status Error: {}", err_text);
        return Err(format!("Xendit API Error: {}", err_text));
    }

    let resp_json: serde_json::Value = response.json().await.map_err(|e| format!("Invalid JSON: {}", e))?;
    
    // Check if there is any payment record with status "SUCCEEDED" or "COMPLETED"
    if let Some(payments) = resp_json["data"].as_array() {
        for payment in payments {
            if let Some(status) = payment["status"].as_str() {
                if status == "SUCCEEDED" || status == "COMPLETED" {
                    println!("✅ Verified payment status for QR ID {}: {}", qr_id, status);
                    return Ok("COMPLETED".to_string());
                }
            }
        }
    }

    Ok("ACTIVE".to_string())
}

fn url_encode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (b as char).to_string()
            }
            _ => format!("%{:02X}", b),
        })
        .collect()
}

#[tauri::command]
async fn gdrive_get_access_token(
    client_id: String,
    client_secret: String,
    refresh_token: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = format!(
        "client_id={}&client_secret={}&refresh_token={}&grant_type=refresh_token",
        url_encode(&client_id),
        url_encode(&client_secret),
        url_encode(&refresh_token)
    );

    let res = client
        .post("https://oauth2.googleapis.com/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Google API error ({}): {}", status, err_text));
    }

    let json = res
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let access_token = json
        .get("access_token")
        .and_then(|t| t.as_str())
        .ok_or_else(|| format!("No access_token in response: {}", json))?;

    Ok(access_token.to_string())
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

    let file_path = ticket_dir.join(&filename);

    // Opsi 2: Jika file sudah ada (berarti retake) dan merupakan foto jepretan,
    // pindahkan file lama yang akan digantikan ke subfolder `history` terlebih dahulu
    if filename.starts_with("photo_") && file_path.exists() {
        let history_dir = ticket_dir.join("history");
        if let Err(e) = fs::create_dir_all(&history_dir) {
            println!("⚠️ Gagal membuat folder history: {}", e);
        } else {
            // Dapatkan timestamp unik dengan presisi milidetik
            let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S_%3f").to_string();
            
            let file_stem = std::path::Path::new(&filename)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("photo");
            let file_ext = std::path::Path::new(&filename)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("jpg");
            
            let history_filename = format!("{}_{}.{}", file_stem, timestamp, file_ext);
            let history_file_path = history_dir.join(&history_filename);
            
            // Pindahkan file lama ke subfolder history
            if let Err(e) = fs::rename(&file_path, &history_file_path) {
                println!("⚠️ Gagal memindahkan file lama ke history: {}", e);
            } else {
                println!("✨ Moved old replaced photo to history: {:?}", history_file_path);
            }
        }
    }

    // Tulis data foto baru (foto aktif) ke file_path utama
    fs::write(&file_path, &image_data).map_err(|e| format!("Failed to write file: {}", e))?;
    println!("📸 Saved active photo: {:?}", file_path);

    Ok(format!("/photos/{}/{}", ticket_code, filename))
}

// Get backend port from environment variable or .env file
fn get_backend_port() -> u16 {
    // Try to get from standard env first
    if let Ok(port_str) = std::env::var("VITE_BACKEND_PORT") {
        if let Ok(port) = port_str.trim().parse::<u16>() {
            return port;
        }
    }

    // Otherwise try to find and read .env file in parent directories
    if let Ok(mut current_dir) = std::env::current_dir() {
        for _ in 0..5 {
            let env_path = current_dir.join(".env");
            if env_path.exists() {
                if let Ok(content) = std::fs::read_to_string(env_path) {
                    for line in content.lines() {
                        let line = line.trim();
                        if line.starts_with('#') || line.is_empty() {
                            continue;
                        }
                        if let Some((key, val)) = line.split_once('=') {
                            if key.trim() == "VITE_BACKEND_PORT" {
                                let val = val.trim().trim_matches('"').trim_matches('\'').trim();
                                if let Ok(port) = val.parse::<u16>() {
                                    return port;
                                
                                }
                            }
                        }
                    }
                }
            }
            if let Some(parent) = current_dir.parent() {
                current_dir = parent.to_path_buf();
            } else {
                break;
            }
        }
    }

    3847 // Default fallback port
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
    format!("http://{}:{}/gallery/{}", ip, get_backend_port(), ticket_code)
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
            $doc.DocumentName = "Inside Studio"
            
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
    <title>Inside Studio - {ticket_code}</title>
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
            <h1>🎭 Inside Studio</h1>
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
            <p>Terima kasih telah menggunakan Inside Studio!</p>
            <p style="margin-top: 5px;">© Rua Rasa Lombok Immersive Edupark</p>
        </footer>
    </div>
</body>
</html>"#,
        ticket_code = ticket_code,
        today = today,
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







// Start the HTTP server
fn start_http_server(app_handle: AppHandle) {
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async move {
            let photos_dir = get_photos_dir();
            

            
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
                        
                    })
                });

            // POST /webhook/xendit-qris - Receive Xendit QRIS webhook
            let xendit_webhook = warp::path!("webhook" / "xendit-qris")
                .and(warp::post())
                .and(warp::body::json())
                .map(move |payload: serde_json::Value| {
                    println!("Received Xendit webhook: {:?}", payload);
                    
                    // Support both nested ("data") and flat webhook payload structures
                    let data_obj = if payload.get("data").is_some() {
                        payload.get("data").unwrap()
                    } else {
                        &payload
                    };
                    
                    let status = data_obj.get("status").and_then(|s| s.as_str()).unwrap_or("");
                    let reference_id = data_obj.get("reference_id").and_then(|r| r.as_str()).unwrap_or("*");
                    
                    if status == "SUCCEEDED" || status == "COMPLETED" {
                        let amount = data_obj.get("amount")
                            .and_then(|a| {
                                a.as_f64().map(|f| f as i32)
                                    .or_else(|| a.as_i64().map(|i| i as i32))
                            })
                            .unwrap_or(0);
                        
                        let confirm_payload = PaymentConfirmation {
                            ticket_code: reference_id.to_string(),
                            amount: Some(amount),
                            cashier_id: Some("XENDIT-QRIS".to_string()),
                        };
                        
                        if let Err(e) = app_handle_xendit.emit("payment-confirmed", confirm_payload) {
                            eprintln!("Failed to emit Xendit payment event: {}", e);
                        } else {
                            println!("Xendit QRIS Payment event emitted to frontend for ticket: {}", reference_id);
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
                    })
                });

            // GET / - Health check (Root)
            let health = warp::path::end().and(warp::get()).map(|| {
                warp::reply::json(&WebhookResponse {
                    success: true,
                    message: "Inside Studio Server is running".to_string(),
                    
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
                .with(cors);

            let ip = get_local_ip();
            let port = get_backend_port();
            println!("🚀 Server starting on http://{}:{}", ip, port);
            println!("📁 Photos directory: {:?}", get_photos_dir());

            // Cleanup old photos on startup (Disabled per user request - use Admin Panel for manual cleanup)
            // cleanup_old_photos();


            warp::serve(routes).run(([0, 0, 0, 0], port)).await;
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
    filter_name: Option<String>,
    photo_count: i32,
    place: Option<String>,
    session_price: i32,
    session_duration: i32,
    actual_duration: i32,
    drive_url: Option<String>,
) -> Result<i64, String> {
    get_database()
        .log_session(
            &ticket_code,
            template_name.as_deref(),
            filter_name.as_deref(),
            photo_count,
            place.as_deref(),
            session_price,
            session_duration,
            actual_duration,
            drive_url.as_deref(),
        )
        .map_err(|e| e.to_string())
}

// Update a session's Google Drive URL
#[tauri::command]
fn db_update_session_drive_url(
    ticket_code: String,
    drive_url: String,
) -> Result<bool, String> {
    get_database()
        .update_session_drive_url(&ticket_code, &drive_url)
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
fn db_get_today_stats() -> Result<(i32, i32), String> {
    get_database()
        .get_today_stats()
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
            gdrive_get_access_token,
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
            db_update_session_drive_url,
            db_get_today_sessions,
            db_get_today_stats,
            create_xendit_qr,
            check_xendit_qr_status,
            db_get_all_sessions,
            db_clear_all_sessions,
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
