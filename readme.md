# Tekiz Üretim Planlama MVP

Bu depo, insan onaylı üretim planlama için FastAPI + React tabanlı veritabanız (JSON) MVP uygulamasını içerir.

## Dizim

- `backend/` – FastAPI uygulaması, planlama, güvenlik ve depolama katmanı
- `frontend/` – React + Vite + Tailwind arayüzü
- `data/` – JSON durum dosyaları ve `events.ndjson` günlükleri

## Geliştirme

### Backend

```bash
uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxy ayarı sayesinde API çağrıları `http://localhost:8000` adresindeki FastAPI sunucusuna yönlenir.
Üretimde gerekirse `VITE_API_BASE` ve `VITE_WS_BASE` ortam değişkenleri ile API ve WebSocket adresleri belirtilebilir.

## Varsayılan Kullanıcılar

| Rol        | E-posta               | Şifre |
|------------|-----------------------|-------|
| admin      | admin@example.com     | admin |
| sales      | satis@example.com     | satis |
| planner    | planlama@example.com  | plan  |
| production | uretim@example.com    | uretim |

## Veri Saklama

Tüm kalıcı veriler `data/` klasöründe JSON dosyalarında ve `events.ndjson` ek günlük dosyasında tutulur. Dosya yazımları `filelock` ile korunur.

## Docker

`docker-compose.yml` dosyası eklenmemiştir; konteynerleştirme ihtiyacına göre eklenebilir.
