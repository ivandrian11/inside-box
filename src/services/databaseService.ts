import { invoke } from '@tauri-apps/api/core'

export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypxx4S5AM441hPM-jwvgeN7q54hkjevgJWu3UHD4INWhdsClccj3Qtus2MNfSirXWL/exec'

// Types
export interface Setting {
  key: string
  value: string
  updated_at: string
}

export interface SessionLog {
  id: number
  ticket_code: string
  template_name: string | null
  filter_used: string | null
  photo_count: number
  place: string | null
  session_price: number
  session_duration: number
  actual_duration: number
  drive_url: string | null
  created_at: string
}

export interface TodayStats {
  total_sessions: number
  total_revenue: number
}

// Setting Keys Constants
export const SettingKeys = {
  SESSION_DURATION_MINUTES: 'session_duration_minutes',
  SESSION_PRICE_THOUSANDS: 'session_price_thousands',
  SELECTED_CAMERA_ID: 'selected_camera_id',
  ADMIN_PIN: 'admin_pin',
  AUTO_PRINT: 'auto_print',
  DEBUG_MODE: 'debug_mode',
  XENDIT_SECRET_KEY: 'xendit_secret_key',
  SESSION_TIMER_SCOPE: 'session_timer_scope',
  FLIP_HORIZONTAL: 'flip_horizontal',
  FLIP_VERTICAL: 'flip_vertical',
  IS_PORTRAIT: 'is_portrait',
  PLACE: 'place',
} as const

// ============ SETTINGS FUNCTIONS ============

/**
 * Get a setting value from database
 */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const value = await invoke<string | null>('db_get_setting', { key })
    return value
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error)
    return null
  }
}

/**
 * Set a setting value in database
 */
export async function setSetting(key: string, value: string): Promise<boolean> {
  try {
    await invoke('db_set_setting', { key, value })
    console.log(`💾 Setting saved: ${key} = ${value}`)
    return true
  } catch (error) {
    console.error(`Failed to set setting ${key}:`, error)
    return false
  }
}

/**
 * Get all settings from database
 */
export async function getAllSettings(): Promise<Setting[]> {
  try {
    return await invoke<Setting[]>('db_get_all_settings')
  } catch (error) {
    console.error('Failed to get all settings:', error)
    return []
  }
}

/**
 * Delete a setting from database
 */
export async function deleteSetting(key: string): Promise<boolean> {
  try {
    return await invoke<boolean>('db_delete_setting', { key })
  } catch (error) {
    console.error(`Failed to delete setting ${key}:`, error)
    return false
  }
}

// ============ HELPER FUNCTIONS FOR COMMON SETTINGS ============

/**
 * Get session duration in minutes (default: 10)
 */
export async function getSessionDurationMinutes(): Promise<number> {
  const value = await getSetting(SettingKeys.SESSION_DURATION_MINUTES)
  return value ? parseInt(value, 10) : 10
}

/**
 * Set session duration in minutes
 */
export async function setSessionDurationMinutes(
  minutes: number,
): Promise<boolean> {
  return setSetting(SettingKeys.SESSION_DURATION_MINUTES, minutes.toString())
}

/**
 * Get session price in thousands (default: 25 = Rp 25.000)
 */
export async function getSessionPriceThousands(): Promise<number> {
  const value = await getSetting(SettingKeys.SESSION_PRICE_THOUSANDS)
  return value ? parseInt(value, 10) : 25
}

/**
 * Set session price in thousands
 */
export async function setSessionPriceThousands(
  price: number,
): Promise<boolean> {
  return setSetting(SettingKeys.SESSION_PRICE_THOUSANDS, price.toString())
}

/**
 * Get selected camera ID
 */
export async function getSelectedCameraId(): Promise<string | null> {
  return getSetting(SettingKeys.SELECTED_CAMERA_ID)
}

/**
 * Set selected camera ID
 */
export async function setSelectedCameraId(cameraId: string): Promise<boolean> {
  return setSetting(SettingKeys.SELECTED_CAMERA_ID, cameraId)
}

/**
 * Get flip horizontal (default: false)
 */
export async function getFlipHorizontal(): Promise<boolean> {
  const value = await getSetting(SettingKeys.FLIP_HORIZONTAL)
  return value === 'true'
}

/**
 * Set flip horizontal
 */
export async function setFlipHorizontal(enabled: boolean): Promise<boolean> {
  return setSetting(SettingKeys.FLIP_HORIZONTAL, enabled.toString())
}

/**
 * Get flip vertical (default: false)
 */
export async function getFlipVertical(): Promise<boolean> {
  const value = await getSetting(SettingKeys.FLIP_VERTICAL)
  return value === 'true'
}

/**
 * Set flip vertical
 */
export async function setFlipVertical(enabled: boolean): Promise<boolean> {
  return setSetting(SettingKeys.FLIP_VERTICAL, enabled.toString())
}

/**
 * Get is portrait (default: false)
 */
export async function getIsPortrait(): Promise<boolean> {
  const value = await getSetting(SettingKeys.IS_PORTRAIT)
  return value === 'true'
}

/**
 * Set is portrait
 */
export async function setIsPortrait(enabled: boolean): Promise<boolean> {
  return setSetting(SettingKeys.IS_PORTRAIT, enabled.toString())
}

/**
 * Get debug mode (default: false)
 */
export async function getDebugMode(): Promise<boolean> {
  const value = await getSetting(SettingKeys.DEBUG_MODE)
  return value === 'true'
}

/**
 * Set debug mode
 */
export async function setDebugMode(enabled: boolean): Promise<boolean> {
  return setSetting(SettingKeys.DEBUG_MODE, enabled.toString())
}


/**
 * Get Xendit Secret Key
 */
export async function getXenditSecretKey(): Promise<string | null> {
  return getSetting(SettingKeys.XENDIT_SECRET_KEY)
}

/**
 * Set Xendit Secret Key
 */
export async function setXenditSecretKey(key: string): Promise<boolean> {
  return setSetting(SettingKeys.XENDIT_SECRET_KEY, key)
}

/**
 * Get Session Timer Scope (default: 'STEP_03')
 */
export async function getSessionTimerScope(): Promise<string> {
  const value = await getSetting(SettingKeys.SESSION_TIMER_SCOPE)
  return value || 'STEP_03'
}

/**
 * Set Session Timer Scope
 */
export async function setSessionTimerScope(scope: string): Promise<boolean> {
  return setSetting(SettingKeys.SESSION_TIMER_SCOPE, scope)
}

/**
 * Get place setting (default: '')
 */
export async function getPlace(): Promise<string> {
  const value = await getSetting(SettingKeys.PLACE)
  return value || ''
}

/**
 * Set place setting
 */
export async function setPlace(place: string): Promise<boolean> {
  return setSetting(SettingKeys.PLACE, place)
}

// ============ SESSION LOG FUNCTIONS ============

/**
 * Log a completed session
 */
export async function logSession(
  ticketCode: string,
  templateName: string | null,
  filterUsed: string | null,
  photoCount: number,
  place: string | null,
  sessionPrice: number,
  sessionDuration: number,
  actualDuration: number,
  driveUrl: string | null = null,
): Promise<number | null> {
  try {
    const sessionId = await invoke<number>('db_log_session', {
      ticketCode,
      templateName,
      filterName: filterUsed,
      photoCount,
      place,
      sessionPrice,
      sessionDuration,
      actualDuration,
      driveUrl,
    })
    console.log(`📝 Session logged: ${ticketCode} (ID: ${sessionId})`)
    return sessionId
  } catch (error) {
    console.error('Failed to log session:', error)
    return null
  }
}

/**
 * Update Google Drive URL for a session
 */
export async function updateSessionDriveUrl(
  ticketCode: string,
  driveUrl: string,
): Promise<boolean> {
  try {
    return await invoke<boolean>('db_update_session_drive_url', {
      ticketCode,
      driveUrl,
    })
  } catch (error) {
    console.error('Failed to update session drive URL:', error)
    return false
  }
}

/**
 * Get today's sessions
 */
export async function getTodaySessions(): Promise<SessionLog[]> {
  try {
    return await invoke<SessionLog[]>('db_get_today_sessions')
  } catch (error) {
    console.error('Failed to get today sessions:', error)
    return []
  }
}

/**
 * Get today's statistics
 */
export async function getTodayStats(): Promise<TodayStats> {
  try {
    const [total_sessions, total_revenue] =
      await invoke<[number, number]>('db_get_today_stats')
    return {
      total_sessions,
      total_revenue,
    }
  } catch (error) {
    console.error('Failed to get today stats:', error)
    return {
      total_sessions: 0,
      total_revenue: 0,
    }
  }
}

// ============ DATA MANAGEMENT ============

/**
 * Get ALL sessions (for export)
 */
export async function getAllSessions(): Promise<SessionLog[]> {
  try {
    return await invoke<SessionLog[]>('db_get_all_sessions')
  } catch (error) {
    console.error('Failed to get all sessions:', error)
    return []
  }
}

/**
 * Clear ALL sessions (Reset Database)
 */
export async function clearAllSessions(): Promise<boolean> {
  try {
    return await invoke<boolean>('db_clear_all_sessions')
  } catch (error) {
    console.error('Failed to clear sessions:', error)
    return false
  }
}

/**
 * Export Database to Google Sheet via App Script
 */
export async function exportToGoogleSheet(
  scriptUrl: string,
  data: SessionLog[],
): Promise<string> {
  try {
    if (!scriptUrl) return 'URL Script kosong'

    const payload = JSON.stringify(data)

    // Using fetch with no-cors.
    // NOTE: With 'no-cors', we get an 'opaque' response.
    // reliable status code is NOT available (it will be 0).
    // We cannot read the response body.
    // We assume if the promise resolves, the request was sent.
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    })

    // In no-cors mode, type is 'opaque' and status is 0.
    // This is the expected behavior for a successful dispatch.
    if (response.type === 'opaque' || response.status === 0 || response.ok) {
      return 'Berhasil: Data dikirim (Cek Spreadsheet)'
    } else {
      return `Gagal export: Status ${response.status}`
    }
  } catch (error: any) {
    console.error('Export error:', error)
    return `Error Network: ${error.message || 'Gagal terhubung'}`
  }
}

/**
 * Export only new, unsent sessions to Google Sheets
 */
export async function exportNewSessions(scriptUrl: string): Promise<string> {
  try {
    if (!scriptUrl) return 'URL Script kosong'

    const allData = await getAllSessions()
    if (allData.length === 0) {
      return 'Database kosong'
    }

    const lastExportId = parseInt(
      localStorage.getItem('last_export_id') || '0',
      10,
    )

    const newData = allData.filter((s) => s.id > lastExportId)
    if (newData.length === 0) {
      return 'Semua data sudah diexport'
    }

    console.log(`📤 Exporting ${newData.length} unsent sessions...`)
    const result = await exportToGoogleSheet(scriptUrl, newData)
    if (result.includes('Berhasil')) {
      const maxId = Math.max(...newData.map((s) => s.id))
      localStorage.setItem('last_export_id', maxId.toString())
      return `Berhasil: ${newData.length} data baru diexport`
    }
    return result
  } catch (error: any) {
    console.error('Failed to export new sessions:', error)
    return `Error: ${error.message || error}`
  }
}

// ============ MIGRATION HELPER ============

/**
 * Migrate localStorage settings to database (run once on app start)
 */
export async function migrateLocalStorageToDatabase(): Promise<void> {
  const migrations = [
    {
      localKey: 'sessionDurationMinutes',
      dbKey: SettingKeys.SESSION_DURATION_MINUTES,
    },
    {
      localKey: 'sessionPriceThousands',
      dbKey: SettingKeys.SESSION_PRICE_THOUSANDS,
    },
    { localKey: 'selectedCameraId', dbKey: SettingKeys.SELECTED_CAMERA_ID },
    { localKey: 'flipHorizontal', dbKey: SettingKeys.FLIP_HORIZONTAL },
    { localKey: 'flipVertical', dbKey: SettingKeys.FLIP_VERTICAL },
    { localKey: 'isPortrait', dbKey: SettingKeys.IS_PORTRAIT },
  ]

  for (const { localKey, dbKey } of migrations) {
    const localValue = localStorage.getItem(localKey)
    if (localValue) {
      const dbValue = await getSetting(dbKey)
      if (!dbValue) {
        // Only migrate if not already in database
        await setSetting(dbKey, localValue)
        console.log(`🔄 Migrated ${localKey} to database`)
      }
    }
  }

  console.log('✅ Migration check complete')
}
