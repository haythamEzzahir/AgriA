# AgriCopilot AI

AI-Powered Agricultural Intelligence & Marketplace Platform

## Architecture

```
agri-copilot/
├── frontend/          # React + Vite + Tailwind + Leaflet
├── backend/           # Node.js + Express API
├── supabase/          # Database schema & migrations
└── .github/           # CI/CD workflows
```

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in your API keys
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, Leaflet.js |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Satellite | AgroMonitoring API |
| Weather | OpenWeather API |
| AI | OpenRouter (Claude/Mistral) |

## Team Roles

- **R1**: Team Lead + Full Stack
- **R2**: Frontend (Map & Visualization)
- **R3**: Frontend (Dashboard & UX)
- **R4**: AI Integration
- **R5**: Marketplace
- **R6**: Auth, DevOps & QA
