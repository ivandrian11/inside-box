# Webhook API Documentation - Rua Rasa Photo Booth

## Overview

Webhook server berjalan di `http://localhost:3847` saat aplikasi Photo Booth aktif.

## Endpoints

### 1. Health Check

Cek apakah webhook server berjalan.

```
GET http://localhost:3847/health
```

**Response:**

```json
{
  "success": true,
  "message": "Rua Rasa Booth Webhook Server is running"
}
```

---

### 2. Konfirmasi Pembayaran

Kirim konfirmasi setelah customer membayar.

```
POST http://localhost:3847/webhook/payment
Content-Type: application/json
```

**Request Body:**

```json
{
  "ticket_code": "ABC123",
  "amount": 25000,
  "cashier_id": "KASIR01"
}
```

| Field         | Type   | Required | Description                                       |
| ------------- | ------ | -------- | ------------------------------------------------- |
| `ticket_code` | string | ✅ Yes   | Kode tiket yang ditampilkan di booth (6 karakter) |
| `amount`      | number | No       | Jumlah pembayaran dalam rupiah                    |
| `cashier_id`  | string | No       | ID kasir yang memproses                           |

**Response Success:**

```json
{
  "success": true,
  "message": "Payment confirmed for ticket: ABC123"
}
```

**Response Error:**

```json
{
  "success": false,
  "message": "Failed to process: [error message]"
}
```

---

## Contoh Penggunaan

### Menggunakan cURL

```bash
# Health check
curl http://localhost:3847/health

# Konfirmasi pembayaran
curl -X POST https://booth.ruarasa.com/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{"ticket_code": "ABC123", "amount": 25000, "cashier_id": "KASIR01"}'
```

### Menggunakan JavaScript/Fetch

```javascript
// Konfirmasi pembayaran
fetch('http://localhost:3847/webhook/payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ticket_code: 'ABC123',
    amount: 25000,
    cashier_id: 'KASIR01',
  }),
})
  .then((response) => response.json())
  .then((data) => console.log(data))
```

### Menggunakan PowerShell

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3847/health" -Method Get

# Konfirmasi pembayaran
$body = @{
    ticket_code = "ABC123"
    amount = 25000
    cashier_id = "KASIR01"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3847/webhook/payment" -Method Post -Body $body -ContentType "application/json"
```

---

## Catatan Penting

1. **Port 3847** - Pastikan port ini tidak digunakan oleh aplikasi lain
2. **Localhost Only** - Webhook hanya menerima koneksi dari localhost untuk keamanan
3. **Ticket Code** - Harus sama persis dengan yang ditampilkan di booth (case-sensitive)
4. **Wildcard** - Gunakan `"ticket_code": "*"` untuk konfirmasi tanpa pengecekan kode (untuk testing)

---

## Integrasi dengan Sistem Kasir

Untuk mengintegrasikan dengan sistem kasir Anda:

1. Saat customer menunjukkan kode tiket, input kode tersebut ke sistem kasir
2. Setelah pembayaran berhasil, sistem kasir mengirim POST request ke webhook
3. Aplikasi booth akan otomatis lanjut ke step berikutnya

Contoh flow:

```
[Customer] --> Lihat kode "XYZ789" di booth
[Customer] --> Pergi ke kasir, sebutkan kode
[Kasir] --> Input kode & terima pembayaran 25K
[Sistem Kasir] --> POST /webhook/payment dengan ticket_code: "XYZ789"
[Booth] --> Otomatis lanjut ke pemilihan template
```
