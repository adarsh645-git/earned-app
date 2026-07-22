# Supabase PostgreSQL Database Setup Guide

This step-by-step guide will help you connect a **100% Free Supabase PostgreSQL Database** to **Earned** so your stats, streak, cash balance, tasks, and store items automatically sync across all your devices in real-time.

---

## Step 1: Create a Free Supabase Account & Project
1. Go to [supabase.com](https://supabase.com) and click **Start your project** (or Sign In with GitHub).
2. Click **New project**.
3. Fill in:
   - **Name**: `Earned`
   - **Database Password**: Pick any secure password.
   - **Region**: Choose a region near you (e.g. `us-east-1`).
4. Click **Create new project** (takes ~1 minute to spin up your PostgreSQL instance).

---

## Step 2: Copy API Keys to Your Environment
1. In your Supabase project dashboard, click the **Settings icon (⚙️)** in the sidebar -> **API**.
2. Copy your **Project URL** and **`anon` `public` key**.
3. In your local `earned-app` project root, create a `.env` file (or copy `.env.example` to `.env`):
   ```text
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
   ```

---

## Step 3: Run Database Migrations
1. In your Supabase dashboard sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open [`supabase/schema.sql`](file:///Users/adarshreddy/Projects/earned-app/supabase/schema.sql) from your project folder, copy its contents, and paste them into the Supabase SQL Editor.
4. Click **Run** (bottom right of SQL Editor).

All tables (`profiles`, `tasks`, `rewards`, `macro_goals`, `collections`, `collection_items`), automated user creation triggers, and Row Level Security (RLS) policies are now active!

---

## Step 4: Test Real-Time Multi-Device Sync
1. Start your local web app:
   ```bash
   npm run web
   ```
2. Open `http://localhost:8081` in your desktop browser -> click **Sync Devices** -> create an account.
3. Open the app on your phone -> click **Sync Devices** -> log in with the same email.
4. Any task completed or reward redeemed on one device will instantly sync across all devices in real-time!
