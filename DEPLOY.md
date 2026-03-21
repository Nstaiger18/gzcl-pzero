# GZCL P-Zero — Deploy to Vercel (PWA)

## What you need
- A free [Vercel account](https://vercel.com) (sign up with GitHub, Google, or email)
- A free [GitHub account](https://github.com) (to host the code)
- Node.js installed on your computer — download from [nodejs.org](https://nodejs.org)

---

## Step 1 — Install dependencies locally (one time)

Open Terminal and navigate to this folder:

```bash
cd path/to/gzcl-pzero
npm install
```

Test it runs locally:

```bash
npm run dev
```

Open http://localhost:5173 — you should see the app.

---

## Step 2 — Push to GitHub

1. Go to [github.com/new](https://github.com/new)
2. Create a **private** repository called `gzcl-pzero`
3. In Terminal, inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/gzcl-pzero.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New Project**
3. Import your `gzcl-pzero` GitHub repository
4. Leave all settings as defaults — Vercel auto-detects Vite
5. Click **Deploy**

You'll get a URL like `https://gzcl-pzero.vercel.app` in about 30 seconds.

---

## Step 4 — Add to iPhone Home Screen

1. Open your Vercel URL in **Safari on your iPhone**
2. Tap the **Share button** (box with arrow at the bottom)
3. Scroll down and tap **Add to Home Screen**
4. Name it "P-Zero" and tap **Add**

The app now appears on your home screen, opens full-screen with no browser chrome, and **all your workout data is saved locally on your iPhone** via localStorage.

---

## Storage notes

- Data is stored in Safari's localStorage on your iPhone
- It persists indefinitely as long as you don't clear Safari's website data
- To back up: go to Settings → Safari → Advanced → Website Data → you can see it there
- If you want to move data to a new phone, you'd need to export/import manually
  (or upgrade to iCloud sync — ask for instructions if needed)

---

## Updates

When you want to update the app:

```bash
# Make changes to src/App.jsx
git add .
git commit -m "Update"
git push
```

Vercel auto-deploys on every push. The PWA on your phone updates in the background.

