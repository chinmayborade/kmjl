# Deployment Guide: Step-by-Step Instructions

This guide provides step-by-step instructions for deploying the **UK Wind Forecast Portal** to **Render** or **Heroku** (both support Docker container deployment where FastAPI serves the built React frontend from a single container).

---

## Pre-Deployment Verification Checklist

Before pushing to your hosting provider, make sure:
1. `frontend/dist` is up-to-date (`cd frontend && npm run build`).
2. All 26 pytest tests pass (`pytest`).
3. Your local git working tree is clean and committed.

---

## Option 1: Deploying to Render (Recommended — Free/Easy Docker Web Service)

Render automatically builds and runs Dockerfiles pushed to a GitHub repository.

### Step 1: Create an Anonymous GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Choose an anonymous name (e.g. `uk-wind-portal-78a` or random string like `qkx94-portal`).
3. Set visibility to **Public** (as specified in challenge brief 3.2).
4. In your terminal, initialize and push your code:
   ```bash
   git add .
   git commit -m "feat: complete UK Wind Forecast Portal with zero lookahead tests"
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Log in to [render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Render will automatically detect the `Dockerfile` at the root:
   - **Name:** `uk-wind-portal` (or similar)
   - **Environment:** `Docker`
   - **Region:** Frankfurt (EU Central) or London (Europe West)
   - **Plan:** Free
5. In the **Environment Variables** section, add:
   - `PORT`: `8000`
   - `DATA_DIR`: `/app/data`
   - `DEBUG`: `false`
6. Click **Create Web Service**.
7. Render will build both stages of the Dockerfile (Node + Python) and deploy the container.
8. Once deployed, test the URL in an **Incognito Window**:
   - Web App: `https://<service-name>.onrender.com`
   - Docs: `https://<service-name>.onrender.com/docs`

---

## Option 2: Deploying to Heroku Container Registry

The project brief explicitly mentions Heroku. Heroku allows running Docker containers via the Heroku CLI.

### Step 1: Login to Heroku CLI
```bash
heroku login
heroku container:login
```

### Step 2: Create a New App
```bash
heroku create uk-wind-portal-<random-id>
```

### Step 3: Build & Push the Docker Image
```bash
# Push container image to Heroku registry
heroku container:push web -a uk-wind-portal-<random-id>

# Release the image to start the container
heroku container:release web -a uk-wind-portal-<random-id>
```

### Step 4: Open and Verify
```bash
heroku open -a uk-wind-portal-<random-id>
```

---

## Option 3: Deploying Frontend to Vercel (Separated Frontend)

If you prefer deploying the React frontend to **Vercel** as mentioned in the brief:
1. Deploy the backend container on Render/Heroku first (e.g. `https://uk-wind-api.onrender.com`).
2. In `frontend/src/api/client.ts`, configure `baseURL` to point to the backend URL via an environment variable `VITE_API_BASE_URL`.
3. Import the `frontend` directory in Vercel.
4. Framework preset: **Vite**.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Add environment variable: `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com`.

---

## Final Submission Verification (Brief Section 3.3)

Once your live link is generated:
1. Open the URL in an **incognito window**.
2. Verify:
   - Decision view loads with all 48 settlement periods for January dates.
   - Date picker and cutoff time toggles update curves smoothly.
   - Swagger docs load at `/docs`.
3. Update the live URL in [README.md](file:///c:/Users/Admin/grodbricks-task/README.md) under Section 5.
4. Paste the public GitHub repo, live URL, and unlisted YouTube video into the submission form.
