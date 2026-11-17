# Connect Claude to Our Home

Once this is set up, you can tell Claude things like *"add milk and eggs to groceries"* or *"Daniel paid ₪240 for dinner"*, and they appear in the app.

Takes about 20–30 minutes, once. You need a computer for steps 3–4.

---

## Step 1: Give Claude its own login (Firebase)

1. Go to **console.firebase.google.com** → your **our-home** project.
2. **Security → Authentication → Users → Add user.**
3. Email: `claude@ourhome.bot`. It doesn't need to be a real inbox.
4. Password: a long password. Save it, because you'll need it in step 4.
5. Click **Add user**.

## Step 2: Allow that login in the rules

1. **Databases and storage → Firestore → Rules.**
2. Add Claude's email to the list, so the line looks like this (with your real emails):

```
request.auth.token.email in ['you@gmail.com', 'daniel@gmail.com', 'claude@ourhome.bot']
```

3. Click **Publish**.

## Step 3: Put the connector online (Cloudflare, free)

1. Go to **dash.cloudflare.com** and sign up (free).
2. In the left menu: **Compute (Workers) → Workers & Pages → Create → Create Worker** (the "Hello World" one).
3. Name it `our-home-claude` → **Deploy**.
4. Click **Edit code**. Delete everything in the editor.
5. Open this link, select all the text (Ctrl/Cmd + A), copy it, and paste it into the editor:
   `https://raw.githubusercontent.com/merona-hub/Our-home/claude/household-expense-app-wzoprv/connector/worker.js`
6. Click **Deploy** (top right).

## Step 4: Add the settings

1. Go back to the worker's page → **Settings → Variables and Secrets → + Add**. Add these three:

| Type   | Name               | Value                                      |
|--------|--------------------|--------------------------------------------|
| Text   | `BOT_EMAIL`        | `claude@ourhome.bot`                       |
| Secret | `BOT_PASSWORD`     | the password from step 1                   |
| Secret | `CONNECTOR_SECRET` | a long random code (Claude gave you one)   |

2. Click **Deploy**.
3. On the worker's page, copy its address. It looks like `https://our-home-claude.YOUR-NAME.workers.dev`.
   Open it in the browser. It should say **"Our Home connector is running."**

Your connector link is that address plus `/mcp/` plus your secret code:

```
https://our-home-claude.YOUR-NAME.workers.dev/mcp/YOUR-SECRET-CODE
```

Keep this link private. Anyone who has it can add things to your app.

## Step 5: Add it to Claude

1. Go to **claude.ai → Settings → Connectors → Add custom connector.**
2. Name: `Our Home`. URL: your connector link from step 4.
3. Click **Add**.
4. In a chat, make sure **Our Home** is switched on: tap the **+** / tools button under the message box.

Try: *"What's on our grocery list?"*

---

## What Claude can do

- Add groceries (with quantity and store), tick them off as bought, and show the list
- Create projects and sub-projects (with budget and deadline)
- Add things to buy to a project (with price, store, link, priority)
- Delete grocery items, things to buy, to-dos, and trip places or plan items
- Add to-dos to a project or trip, tick them off, and list them
- Add expenses (any currency, any split, to a trip), and show who owes whom
- Save places and add plans to a trip
- Give an overview of everything

Claude can delete items, to-dos and trip places, but not expenses, projects or trips. Those are deleted in the app.

## Turning it off

Any of these work:
- In Claude: Settings → Connectors → remove **Our Home**.
- In Firebase: Authentication → Users → disable `claude@ourhome.bot`.
- In Cloudflare: delete the worker.

If Daniel wants it too, he adds the same link in his own Claude account (step 5).
