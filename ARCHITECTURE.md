# AI Headhunter SaaS - Architecture Complete

## 🎯 Vision du Produit

Application SaaS pour headhunters permettant de:
1. Créer des "hunts" (campagnes de recherche)
2. Générer automatiquement des requêtes X-Ray optimisées via LLM
3. Exécuter les recherches de manière asynchrone
4. Gérer et exporter les profils trouvés

## 🏗️ Stack Technique

### Frontend
- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase Client** (Auth + Realtime)

### Backend
- **Next.js API Routes**
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Inngest** (Background jobs)

### Services
- **OpenAI GPT** (génération de queries)
- **SerpAPI** (recherche Google/LinkedIn)

### Deployment
- **Vercel** (Frontend + API)
- **Supabase Cloud** (Database)
- **Inngest Cloud** (Jobs)

## 📊 Database Schema

```sql
-- Table: hunts
CREATE TABLE hunts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- status: draft | active | paused | completed
  num_queries INTEGER DEFAULT 20,
  results_per_query INTEGER DEFAULT 100,
  max_results INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: queries
CREATE TABLE queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  xray_query TEXT NOT NULL,
  job_title TEXT,
  company TEXT,
  location TEXT,
  priority INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  -- status: pending | running | completed | failed
  results_count INTEGER DEFAULT 0,
  executed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  query_id UUID REFERENCES queries(id) ON DELETE SET NULL,
  linkedin_url TEXT NOT NULL,
  name TEXT,
  headline TEXT,
  rank INTEGER,
  source_query TEXT,
  tags TEXT[], -- pour filtrage
  notes TEXT,
  status TEXT DEFAULT 'new',
  -- status: new | contacted | interested | rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hunt_id, linkedin_url)
);

-- Indexes
CREATE INDEX idx_hunts_user ON hunts(user_id);
CREATE INDEX idx_hunts_status ON hunts(status);
CREATE INDEX idx_queries_hunt ON queries(hunt_id);
CREATE INDEX idx_queries_status ON queries(status);
CREATE INDEX idx_profiles_hunt ON profiles(hunt_id);
CREATE INDEX idx_profiles_status ON profiles(status);

-- Row Level Security
ALTER TABLE hunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only see their own hunts"
  ON hunts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only see queries from their hunts"
  ON queries FOR ALL
  USING (
    hunt_id IN (
      SELECT id FROM hunts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can only see profiles from their hunts"
  ON profiles FOR ALL
  USING (
    hunt_id IN (
      SELECT id FROM hunts WHERE user_id = auth.uid()
    )
  );
```

## 📁 Project Structure

```
ai-headhunter-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Dashboard layout with nav
│   │   ├── page.tsx                 # Dashboard home
│   │   ├── hunts/
│   │   │   ├── page.tsx             # Liste des hunts
│   │   │   ├── new/
│   │   │   │   └── page.tsx         # Créer un hunt
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Détails + profiles
│   │   │       └── queries/
│   │   │           └── page.tsx     # Gérer les queries
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── hunts/
│   │   │   ├── route.ts             # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts         # GET, PATCH, DELETE
│   │   │       ├── queries/
│   │   │       │   └── route.ts     # POST (generate queries)
│   │   │       ├── execute/
│   │   │       │   └── route.ts     # POST (start search)
│   │   │       └── profiles/
│   │   │           └── route.ts     # GET (list profiles)
│   │   └── inngest/
│   │       └── route.ts             # Inngest webhook
│   ├── layout.tsx
│   └── page.tsx                     # Landing page
├── components/
│   ├── ui/                          # shadcn components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   ├── dashboard/
│   │   ├── nav.tsx
│   │   └── stats-cards.tsx
│   ├── hunts/
│   │   ├── hunt-card.tsx
│   │   ├── hunt-form.tsx
│   │   ├── hunt-stats.tsx
│   │   └── query-list.tsx
│   └── profiles/
│       ├── profile-table.tsx
│       ├── profile-card.tsx
│       └── profile-filters.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser client
│   │   ├── server.ts                # Server client
│   │   └── middleware.ts
│   ├── ai/
│   │   └── generate-queries.ts      # OpenAI integration
│   ├── inngest/
│   │   └── client.ts
│   └── utils.ts
├── inngest/
│   └── functions.ts                 # Background job definitions
├── types/
│   └── database.ts                  # Supabase types
├── .env.local
├── middleware.ts                    # Auth middleware
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🔄 User Flow

### 1. Create Hunt
```
User → Dashboard → "New Hunt"
→ Enter description (free text)
→ Save as draft
```

### 2. Generate Queries
```
Hunt Detail → "Generate Queries"
→ API calls OpenAI
→ Returns 20 optimized X-Ray queries
→ User can edit/remove
→ Save queries to DB
```

### 3. Execute Search
```
Hunt Detail → "Start Search"
→ API triggers Inngest job
→ Inngest executes queries async
→ For each query:
  - Call SerpAPI with pagination
  - Extract profiles
  - Save to DB (deduplicated)
  - Update realtime
→ User sees profiles appearing in real-time
```

### 4. Manage Profiles
```
Hunt Detail → Profiles Tab
→ Table with filters/sort
→ Mark status (contacted/interested/rejected)
→ Export to CSV
→ Add notes
```

## 🎨 UI/UX Principles

### Dashboard
- Stats cards: Total hunts, Active hunts, Total profiles, Success rate
- Hunt cards in grid view
- Quick actions prominently displayed

### Hunt Detail
- Tabs: Overview | Queries | Profiles
- Progress bar for active searches
- Real-time updates via Supabase

### Professional Feel
- Clean, minimal design
- Fast interactions
- Keyboard shortcuts
- Export functionality
- Dark mode support

## 🚀 Deployment

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# SerpAPI
SERPAPI_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### Vercel Deployment
```bash
vercel --prod
```

### Supabase Setup
1. Create project on supabase.com
2. Run SQL schema
3. Enable Email Auth
4. Copy keys to .env.local

### Inngest Setup
1. Create account on inngest.com
2. Create app
3. Deploy functions
4. Copy keys

## 📈 Scaling Considerations

### MVP (< 100 users)
- Supabase Free Tier (500MB)
- Inngest Free Tier (50k events/month)
- Vercel Hobby (free)

### Growth (100-1000 users)
- Supabase Pro ($25/mo)
- Inngest Team ($50/mo)
- Vercel Pro ($20/mo)

### Scale (1000+ users)
- Add caching (Upstash Redis)
- Rate limiting
- Queue management
- Monitoring (Sentry)

## ✅ MVP Features Checklist

- [ ] Auth (Login/Signup)
- [ ] Hunt CRUD
- [ ] LLM Query Generation
- [ ] Inngest Job Execution
- [ ] Profile Display
- [ ] Real-time Updates
- [ ] Export CSV
- [ ] Professional UI

## 🔜 Future Enhancements

- Profile enrichment (Proxycurl)
- AI scoring
- Email outreach
- CRM integration
- Team collaboration
- Analytics dashboard
