# Google OAuth Authentication Setup Guide (1 Minute)

Google OAuth is integrated into **Earned**. Follow these steps to enable Google Sign-In in your Supabase Project Dashboard.

---

## Step 1: Enable Google Provider in Supabase
1. Open your Supabase Dashboard:  
   👉 **[https://supabase.com/dashboard/project/lpzwsqcqyblxaopsttho/auth/providers](https://supabase.com/dashboard/project/lpzwsqcqyblxaopsttho/auth/providers)**
2. Scroll down to **Google** under Auth Providers.
3. Click to expand **Google** and toggle **Enabled** to `ON`.
4. Click **Save** (bottom right).

---

## Step 2: Test Google Sign-In
1. Start your local web app:
   ```bash
   npx expo start --web
   ```
2. Open `http://localhost:8081` -> click **Sync Devices**.
3. Tap **Continue with Google**.
4. Log in with your Gmail account — Google will authenticate you and redirect back to Earned, syncing your focus streak, cash balance, tasks, and store across all your devices!
