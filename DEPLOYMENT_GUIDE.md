# DataWhisperer Deployment Guide (Free Tier Edition)

Follow these steps to deploy DataWhisperer using only **Free Services**: **Frontend on Vercel** and **Backend on Koyeb**.

## Step 1: Deploy Backend (Koyeb) - [Free]

1.  Log in to [Koyeb](https://app.koyeb.com/). (No credit card required for the Starter tier).
2.  Click **"Create Service"**.
3.  Select **"GitHub"** as the source.
4.  Choose your `prototype` repository.
5.  **Service Settings:**
    - **Instance Type:** Nano (Free).
    - **Work Directory:** Set this to `backend`.
    - **Build Strategy:** Docker-based (Koyeb will auto-detect the `Dockerfile`).
6.  **Environment Variables:**
    - Go to the **"App and service settings"** -> **"Environment variables"**.
    - Add:
        - `GROQ_API_KEY`: (Your Groq API key)
        - `GROQ_API_KEYS`: (Comma-separated pool of keys)
        - `PORT`: `8000`
7.  Click **"Deploy"**.
8.  Once deployed, copy your **Koyeb Service URL** (e.g., `https://datawhisperer-xxx.koyeb.app`).

---

## Step 2: Deploy Frontend (Vercel) - [Free]

1.  Log in to [Vercel](https://vercel.com/dashboard).
2.  Click **"Add New"** -> **"Project"**.
3.  Select the `prototype` repository.
4.  **Project Settings:**
    - **Root Directory:** Set this to `frontend`.
    - **Framework Preset:** Next.js.
5.  **Environment Variables:**
    - Expand the "Environment Variables" section.
    - Add: `NEXT_PUBLIC_API_URL`
    - Value: (Paste your **Koyeb Service URL** from Step 1).
6.  Click **"Deploy"**.

---

## Important Notes

### 1. Database
- The backend uses a local `demo.db` (SQLite). 
- **Warning:** On Koyeb's free tier, any data added to this database will be **wiped** whenever the service restarts.
- **Solution:** For persistent storage, use a free PostgreSQL database from **Supabase** or **Neon**, and update the `DATABASE_URL` in your Koyeb environment variables.

### 2. Startup Time
- The free "Nano" instance might take a minute to "wake up" if it hasn't been used. Please be patient on the first request.
