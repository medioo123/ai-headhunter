# AI Headhunter

Production SaaS platform for headhunters to find LinkedIn profiles using AI-powered X-Ray search.

## Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind + shadcn/ui
- **Backend**: Next.js API Routes + Python Search Engine
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Jobs**: Inngest (async search execution)
- **AI**: OpenAI GPT (query generation)
- **Search**: SerpAPI (Google/LinkedIn)

## Project Structure

```
ai-headhunter/
├── backend/              # Python search engine
│   └── smart_search.py   # LLM-powered LinkedIn X-Ray search
├── app/                  # Next.js app (to be created)
├── supabase/            # Database migrations
└── ARCHITECTURE.md      # Detailed architecture
```

## Features

- 🔍 AI-powered X-Ray query generation
- 🚀 Async search execution with real-time updates
- 👥 Multi-user support with authentication
- 📊 Professional dashboard for hunt management
- 📥 Export profiles to CSV
- 🎯 Smart deduplication

## Setup

See `ARCHITECTURE.md` for detailed setup instructions.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run Python backend
cd backend && python smart_search.py
```

## License

MIT
