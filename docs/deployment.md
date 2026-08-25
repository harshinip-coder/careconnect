# CareConnect Production Deployment Guide

## System Requirements
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (for production channels & Celery)

## 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Configure Environment
cp .env.example .env
# Edit .env to configure DATABASE_URL, SECRET_KEY, REDIS_URL

# Database Migrations & Seed Data
python manage.py migrate
python seed_data.py

# Run ASGI Server (Daphne) for WebSockets
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

## 2. Mobile App Setup

```bash
cd mobile
npm install

# Run Expo Development Server
npx expo start

# Build Production Android APK/AAB
npx expo run:android
```

## 3. Production Environment Variables (.env)

```env
DEBUG=False
SECRET_KEY=production-secure-random-key-change-in-prod
ALLOWED_HOSTS=api.careconnect.com,localhost
DATABASE_URL=postgres://user:password@localhost:5432/careconnect_db
REDIS_URL=redis://localhost:6379/0
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://app.careconnect.com
ESCALATION_TIMER_SECONDS=30
```
