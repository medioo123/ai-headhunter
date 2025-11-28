# Setup Guide - AI Headhunter

## 🗄️ Step 1: Create Supabase Project

### 1.1 Create Account & Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up / Login
3. Click "New Project"
4. Fill in:
   - **Name**: `ai-headhunter`
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
   - **Plan**: Free tier is perfect for now

### 1.2 Wait for Database to Initialize
Takes ~2 minutes. You'll see a dashboard when ready.

---

## 📊 Step 2: Run Database Migration

### 2.1 Open SQL Editor
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"

### 2.2 Copy & Execute Migration
1. Open `supabase/migrations/001_initial_schema.sql` from this repo
2. Copy ALL the SQL
3. Paste into Supabase SQL Editor
4. Click **Run** (or Cmd+Enter)

### 2.3 Verify Tables Created
Go to **Table Editor** (left sidebar). You should see:
- ✅ `hunts`
- ✅ `queries`
- ✅ `profiles`
- ✅ `hunt_stats` (view)

---

## 🔑 Step 3: Get API Keys

### 3.1 Navigate to Settings
1. Click **Settings** (gear icon, left sidebar)
2. Go to **API** section

### 3.2 Copy These Values
You need 3 values:

1. **Project URL**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

2. **Anon (public) Key** - Click "Reveal" and copy
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Service Role Key** - Click "Reveal" and copy (⚠️ Keep secret!)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## ⚙️ Step 4: Configure Environment

### 4.1 Create .env.local File
In the project root, create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your_service_key

# OpenAI
OPENAI_API_KEY=sk-proj-...your_openai_key

# SerpAPI
SERPAPI_KEY=...your_serpapi_key
```

Replace with your actual keys!

---

## 🧪 Step 5: Test Database

### 5.1 Insert Test Data (SQL Editor)
```sql
-- Insert a test hunt
INSERT INTO hunts (user_id, name, description, status)
VALUES (
  auth.uid(),
  'Test Hunt',
  'Chargés d''affaires, BNP, Paris',
  'draft'
);

-- View the hunt
SELECT * FROM hunts;
```

### 5.2 Enable Email Auth
1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Disable email confirmation for testing:
   - Go to **Authentication** → **Settings**
   - Toggle OFF "Enable email confirmations"

---

## ✅ Verification Checklist

Before proceeding to Next.js:

- [ ] Supabase project created
- [ ] Database migration ran successfully
- [ ] All 3 tables visible in Table Editor
- [ ] API keys copied
- [ ] `.env.local` file created with all keys
- [ ] Email auth enabled

---

## 🚀 Next Steps

Once Supabase is ready:
1. Create Next.js app
2. Install Supabase client
3. Build first API endpoint
4. Test CRUD operations
5. Build UI

---

## 📝 Notes

- **Free Tier Limits**: 500MB storage, 50k monthly active users
- **RLS is ENABLED**: All tables have Row Level Security
- **Auth Required**: Users can only see their own data
- **Realtime Ready**: Can enable realtime for live updates

## 🆘 Troubleshooting

**Migration fails?**
- Make sure you copied the ENTIRE SQL file
- Check for any error messages
- Try running sections separately

**Can't see tables?**
- Refresh the Table Editor page
- Check SQL Editor for error logs

**RLS blocking inserts?**
- You need to be authenticated
- Or temporarily disable RLS for testing

---

Ready? Let me know when Supabase is setup and I'll build the Next.js app! 🎉
