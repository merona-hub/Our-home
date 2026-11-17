# Setting up Our Home — step by step

There are 4 steps. Steps 1 and 4 take a couple of minutes. Steps 2–3 take about 10 minutes, once.

---

## Step 1 — Put the app online (GitHub Pages)

This gives the app a web address you can open on your phone.

1. On a computer, open **github.com/merona-hub/Our-home** and sign in.
2. Click **Settings** (top of the page, the ⚙️ tab).
3. In the left menu, click **Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Under **Branch**, choose **`claude/household-expense-app-wzoprv`**, leave the folder as **`/ (root)`**, and click **Save**.
6. Wait 1–2 minutes and refresh the page. A link will appear at the top:
   **`https://merona-hub.github.io/Our-home/`** — that's your app.

> If GitHub says Pages isn't available, the repository is probably private.
> Free accounts need it public: **Settings → General → scroll to the bottom → Change visibility → Public**.
> That's safe: only the app's code is public. Your actual data (expenses etc.) lives in Firebase (step 2) and is locked to your two emails (step 3).

You can open the link on your phone right away. It works in **demo mode** (saved only on that phone) until step 2 is done.

---

## Step 2 — Shared data for both phones (Firebase, free)

Firebase is Google's free service that stores the data so you and Daniel see the same thing, and keeps it safe.

1. Go to **console.firebase.google.com** and sign in with your Google account.
2. Click **Create a project** (or "Add project"). Name it `our-home`. You can turn **off** Google Analytics. Click **Create project**, then **Continue**.
3. **Turn on the database:**
   - In the left menu: **Build → Firestore Database → Create database**.
   - Location: choose **eur3 (europe-west)** or anything close. Click **Next**.
   - Choose **Start in production mode**. Click **Create**.
4. **Turn on sign-in:**
   - Left menu: **Build → Authentication → Get started**.
   - Under **Sign-in method**, click **Email/Password**, switch on the first toggle (**Enable**), click **Save**.
5. **Connect the app:**
   - Click the ⚙️ next to **Project Overview** (top left) → **Project settings**.
   - Scroll down to **Your apps** and click the **`</>`** (Web) icon.
   - Nickname: `our-home`. Do **not** tick Firebase Hosting. Click **Register app**.
   - You'll see a block of code with `const firebaseConfig = { apiKey: ..., ... }`.
   - **Copy that block and send it to Claude.** (It's not a password — it's safe to share; the security comes from step 3.)
6. **Allow your web address:**
   - Back in **Authentication → Settings → Authorized domains → Add domain**, add: `merona-hub.github.io`

Claude will put the config into the app and save it. After that, the app asks you to sign in.

---

## Step 3 — Lock the data to just the two of you

1. In Firebase, go to **Firestore Database → Rules** (tab at the top).
2. Delete everything there and paste this — **replacing the two emails with yours and Daniel's**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /homes/{home}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.token.email in ['YOUR-EMAIL@gmail.com', 'DANIELS-EMAIL@gmail.com'];
    }
  }
}
```

3. Click **Publish**.

Now only those two emails can open your home's data.

---

## Step 4 — On each phone

1. Open **`https://merona-hub.github.io/Our-home/`**
2. Tap **First time? Create account**, using the email from step 3 and a password (at least 6 characters). Next time just **Sign in** — you'll stay signed in.
3. Add it to the home screen:
   - **iPhone (Safari):** tap the **Share** button (square with an arrow) → **Add to Home Screen** → **Add**.
   - **Android (Chrome):** tap the **⋮** menu → **Add to Home screen** (or **Install app**) → **Install**.

It now opens like a normal app, with its own icon. 🏠

---

## Good to know

- **Names, home name and color:** tap ⚙️ in the top corner of the app.
- **Backup:** ⚙️ → **Download a backup** saves a copy of everything to your phone. Firebase also keeps the data permanently; nothing is deleted unless one of you deletes it.
- **Works offline:** you can add things without internet; they sync when you're back online.
- **Demo data:** anything added in demo mode stays only on that phone and isn't copied into the shared version.
