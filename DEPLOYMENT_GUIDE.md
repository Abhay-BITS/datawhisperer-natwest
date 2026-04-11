# DataWhisperer Deployment Guide

Follow these steps to deploy DataWhisperer: **Frontend on Vercel** and **Backend on Render**.

## Step 1: Deploy Backend (Render)

1.  Log in to [Render](https://dashboard.render.com/).
2.  Click **"New +"** and select **"Blueprint"**.
3.  Connect your GitHub repository (`prototype`).
4.  Render will detect the `render.yaml` file. Click **"Apply"**.
5.  **Environment Variables:**
    - Go to your new **"datawhisperer-api"** service.
    - Click **"Environment"** in the sidebar.
    - Add your secret keys (copy them from your local `backend/.env`):
        - `GROQ_API_KEY`: (Your Groq API key)
        - `GROQ_API_KEYS`: (Comma-separated keys)
        - (Add others like `SMTP_USER`, `SMTP_PASS` if you want email reporting).
6.  Once deployed, copy your **Render Service URL** (e.g., `https://datawhisperer-api.onrender.com`).

---

## Step 2: Deploy Frontend (Vercel)

1.  Log in to [Vercel](https://vercel.com/dashboard).
2.  Click **"Add New"** -> **"Project"**.
3.  Select the `prototype` repository.
4.  **Project Settings:**
    - **Root Directory:** Set this to `frontend`.
    - **Framework Preset:** Next.js.
5.  **Environment Variables:**
    - Expand the "Environment Variables" section.
    - Add: `NEXT_PUBLIC_API_URL`
    - Value: (Paste your **Render Service URL** from Step 1).
6.  Click **"Deploy"**.

---

## Important Notes

### 1. Database
- The backend currently uses a local `demo.db` (SQLite). 
- **Warning:** On Render's free tier, any data added to this database (like new sources or chats) will be **wiped** whenever the service restarts.
- **Solution:** For persistent storage, create a **Render PostgreSQL** database and update the `DATABASE_URL` in your Backend Environment Variables.

### 2. CORS
- The backend is configured to accept requests from any origin (`*`). This is fine for prototyping.
- For production, you should update `backend/main.py` to only allow your Vercel deployment URL.

### 3. API Keys
- Never share your Render or Vercel URLs if you have pre-loaded them with expensive API keys in public repos.
