# DataWhisperer Deployment Guide (Truly Free Edition)

Follow these steps to deploy DataWhisperer using only **Truly Free Services**: **Frontend on Vercel** and **Backend on Hugging Face Spaces**.

## Step 1: Deploy Backend (Hugging Face Spaces) - [TRULY FREE]

Hugging Face Spaces is 100% free and does **not** require a credit card.

1.  Log in to [Hugging Face](https://huggingface.co/).
2.  Go to **"Spaces"** -> **"Create New Space"**.
3.  **Space Settings:**
    - **Space Name:** `datawhisperer-api` (or any name you like).
    - **SDK:** Select **Docker**.
    - **Space Hardware:** Choose the free **"CPU Basic"** (2 vCPU, 16GB RAM).
    - **Visibility:** Public (Recommended for prototype).
4.  Once created, go to the **"Settings"** tab of your new Space.
5.  Scroll down to **"Variables and Secrets"**.
6.  Add these **Secrets** (not variables):
    - `GROQ_API_KEY`: (Your Groq API key)
    - `GROQ_API_KEYS`: (Comma-separated pool of keys)
7.  Go to the **"Files"** tab, click **"New File"** if you want to upload manually, OR better:
    - Click **"Settings"** -> **"Repository"** -> **"Sync from GitHub"**.
    - Connect your GitHub account and select the `prototype` repository.
8.  Hugging Face will automatically find the root-level `Dockerfile` and start building. It will listen on port `7860` automatically.
9.  Once the status is **"Running"**, copy the URL of your Space. It will look like: `https://<username>-datawhisperer-api.hf.space`.

---

## Step 2: Deploy Frontend (Vercel) - [TRULY FREE]

1.  Log in to [Vercel](https://vercel.com/dashboard).
2.  Click **"Add New"** -> **"Project"**.
3.  Select the `prototype` repository.
4.  **Project Settings:**
    - **Root Directory:** Set this to `frontend`.
    - **Framework Preset:** Next.js.
5.  **Environment Variables:**
    - Add: `NEXT_PUBLIC_API_URL`
    - Value: (Paste your **Hugging Face Space URL** from Step 1).
6.  Click **"Deploy"**.

---

## Important Notes

### 1. Database
- The backend uses a local `demo.db` (SQLite). 
- **Warning:** On Hugging Face Spaces, any data added to this database will be **wiped** whenever the space sleeps or restarts.
- **Solution:** For persistent storage, use a free PostgreSQL database from **Supabase** or **Neon**, and update the `DATABASE_URL` in your HF Space Secrets.

### 2. Space Sleep
- Free Tier Spaces go to "sleep" after 48 hours of inactivity. The first person to visit the site after it sleeps will have to wait about 30–60 seconds for it to wake up.
