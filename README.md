# ⚡ Earned — Discipline Economy & Focus Tracker

> **Work hard. Spend guilt-free.**  
> *A gamified, behavioral-economy productivity web & mobile application built with React Native (Expo Web), Zustand, and Supabase.*

---

## 🎯 Intention & Philosophy

**Earned** shifts focus tracking from a chore into a self-sustaining **Discipline Economy**. It operates on principles of behavioral psychology and economic reinforcement:

1. **Dual-Currency Model**:
   - **Cash Balance ($)**: Earned through focused work (e.g., $0.02 per key/focus minute). Used to redeem custom real-life rewards or clear debt.
   - **Hours Balance**: Earned alongside Cash to permit guilt-free entertainment and leisure time.
2. **Debt & Credit System**:
   - Overindulging without sufficient focus time puts your account in **Debt**.
   - Your **Discipline Credit Score** dynamic score adapts based on streak consistency, completed goals, and default history.
3. **Macro Goals & Journeys**:
   - **Pyramid Targets**: Set long-term productive or entertainment targets measured in focus hours or unit progress (e.g., "Read 20 Books").
   - **Journeys (Collections)**: Committed lists (books, video games, stocks, fitness milestones) that directly feed into macro goals upon completion.

---

## 🏗️ Architecture & Tech Stack

Earned is designed as a **Local-First, Cloud-Synced Application**:

```
 ┌─────────────────────────────────────────────────────────┐
 │               React Native (Expo Web / Mobile)          │
 │                                                         │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │        Zustand Local State + AsyncStorage         │  │
 │  │   (Instant UI updates, 100% offline functional)   │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 └────────────────────────────┼────────────────────────────┘
                              │ Real-time Sync Engine
 ┌────────────────────────────▼────────────────────────────┐
 │                  Supabase Cloud Backend                 │
 │                                                         │
 │  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
 │  │  PostgreSQL  │   │  Auth (Google│   │  Realtime   │  │
 │  │  + RLS Rules │   │   & Email)   │   │  WebSockets │  │
 │  └──────────────┘   └──────────────┘   └─────────────┘  │
 └─────────────────────────────────────────────────────────┘
```

- **Frontend Framework**: Expo SDK 57 (React Native for Web), React 19, TypeScript.
- **State & Local Storage**: `Zustand` with `persist` middleware wrapping `@react-native-async-storage/async-storage` via a safe fallback layer (`safeStorage.ts`).
- **Backend & Real-Time Sync**: `Supabase` (PostgreSQL with Row-Level Security, Google OAuth 2.0, Realtime WebSocket subscriptions).
- **Deployment & Hosting**: `Vercel` static export via `npx expo export -p web` with explicit `Cache-Control` header management (`vercel.json`) to prevent stale UI states.

---

## 🚀 Running Locally

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/earned-app.git
   cd earned-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start the local development server**:
   ```bash
   # Start in browser
   npm run web

   # Or start Expo CLI
   npm run start
   ```
   Open `http://localhost:8081` (or `http://localhost:3000`) to view the app.

---

## 🚢 How the App is Currently Deployed

- **Database**: Hosted on Supabase Free Tier. Tables are protected by strict Row-Level Security (RLS) policies matching `auth.uid()`.
- **Frontend Hosting**: Deployed on **Vercel** as a static web bundle.
- **Cache-Busting Configuration**: The root [`vercel.json`](file:///Users/adarshreddy/Projects/earned-app/vercel.json) enforces `Cache-Control: public, max-age=0, must-revalidate` for all routes to ensure clients immediately fetch updated JS bundles on deployment.

---

## 🛠️ How You Can Deploy Your Own Instance

Follow these 4 steps to deploy your own instance of Earned for free.

### Step 1: Set Up Supabase Backend
1. Create a free account at [supabase.com](https://supabase.com) and start a new project.
2. Go to **SQL Editor** in your Supabase dashboard.
3. Run the consolidated schema script:
   - Copy the contents of [`supabase/schema.sql`](file:///Users/adarshreddy/Projects/earned-app/supabase/schema.sql) and execute it.
   *(Or execute individual migration scripts in [`supabase/migrations/`](file:///Users/adarshreddy/Projects/earned-app/supabase/migrations/))*
4. Copy your **Project URL** and **`anon` `public` key** from **Project Settings ⚙️ -> API**.

### Step 2: Configure Authentication (Google OAuth Optional)
1. In Supabase Dashboard, navigate to **Authentication -> Providers**.
2. Enable **Email/Password** sign in.
3. (Optional) Enable **Google Provider** by providing your Google OAuth Client ID & Secret (see [`supabase/docs/GOOGLE_AUTH_SETUP.md`](file:///Users/adarshreddy/Projects/earned-app/supabase/docs/GOOGLE_AUTH_SETUP.md)).
4. Under **Authentication -> URL Configuration**, set your **Site URL** to your planned Vercel URL (e.g. `https://earned.vercel.app`).

### Step 3: Deploy Frontend to Vercel
1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Set the Framework Preset to **Other** (or Vite/Expo).
4. Add the following Environment Variables in Vercel settings:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
5. Click **Deploy**. Vercel will run `npx expo export -p web` (as defined in `vercel.json`) and output the static site from `dist/`.

---

## 📜 License
MIT License. Feel free to use and modify for personal discipline building!