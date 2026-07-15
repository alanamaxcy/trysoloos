# Workspace — Operations Platform (self-hosted)

A single-file operations workspace for small teams: sales pipeline/CRM, projects and
tasks with time tracking, to-dos, goals, a content calendar, meetings, people directory,
docs and notes, reporting, and an optional AI assistant. It runs on **Netlify** with
**Netlify Blobs** for shared storage, so everyone on your team sees the same live workspace.

This is the **source code** — you deploy your own private instance and brand it as your own.

---

## What you get

- `public/index.html` — the entire app (UI + logic, one file).
- `public/playbook.html` — an editable sales-playbook starter (shown in the Pipeline tab).
- `public/manifest.webmanifest`, `public/favicon.*`, `public/icons/` — installable PWA assets.
- `netlify/functions/` — serverless backend:
  - `data.mjs` — shared JSON store (Netlify Blobs). No data ever leaves your site.
  - `claude.mjs` — proxy to the Anthropic API for the AI features.
  - `notify.mjs`, `digest.mjs`, `ics.mjs`, `qbo-*.mjs` — email/Slack, weekly digest, calendar feed, QuickBooks (all optional).

The app ships **empty**. There is no demo data and no prior owner's information.

---

## Deploy in 5 minutes

1. Create a new site on [Netlify](https://www.netlify.com) and connect this repo (or drag-and-drop the folder).
2. Netlify auto-detects the functions in `netlify/functions`. No build step is required.
3. Enable **Netlify Blobs** (it's on by default for new sites).
4. Open your new site URL. The **first-run setup wizard** appears.

### First-run setup

On a brand-new deploy, the app shows a setup page that collects:

- **Organization name** (shown in the sidebar and on reports)
- **Accent color** and **sidebar color** (hex)
- **Logo** (optional image upload; falls back to your name as a wordmark)
- **First user** — name and password

Click **Create workspace** and you're in. From then on, the site shows a normal login.
Add more teammates later under **Settings → People / sign-in**.

> Each fresh Netlify deploy has its own empty Blobs store, so every buyer's first visit
> starts at the setup wizard. Re-deploying the **same** site keeps its data.

---

## Optional environment variables

Set these under **Site settings → Environment variables**, then redeploy. All are optional —
the app runs fine without them; the related features simply stay off until configured.

| Variable | Enables |
|---|---|
| `ANTHROPIC_API_KEY` | The AI assistant, draft-writing, and research features |
| `SENDGRID_API_KEY`, `SENDGRID_FROM` | Email sending (test email, weekly focus digest) |
| `SLACK_WEBHOOK_URL` | Slack notifications |
| `QBO_*` | QuickBooks revenue sync (advanced, optional) |
| `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_REDIRECT_URI` | Send email from your own Outlook/Microsoft 365 mailbox (see below) |

### Outlook email (Microsoft Graph)

Lets the app send drafts straight from a user's Outlook/Microsoft 365 mailbox with full HTML, so hyperlinks stay clickable and a copy lands in Sent. One-time Azure setup:

1. Microsoft Entra admin center (entra.microsoft.com) → App registrations → New registration. Name it after your workspace; account types: "Accounts in any organizational directory and personal Microsoft accounts."
2. Authentication → Add a platform → Web → Redirect URI = your site origin + `/api/outlook-callback`.
3. API permissions → Microsoft Graph → Delegated → add `Mail.Send`, `User.Read`, `offline_access`.
4. Certificates & secrets → New client secret → copy its Value.
5. In Netlify, set `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, and `MS_REDIRECT_URI` (the redirect URL from step 2). Optional `MS_TENANT` defaults to `common`.
6. Redeploy the site — required. Environment variables only take effect on a new deploy (Netlify → Deploys → Trigger deploy → Deploy site). Then Settings → Connections → Outlook Email → Connect Outlook.

When adding the variables, give each one Scopes = **All scopes**, and mark `MS_CLIENT_SECRET` as a secret (the other two are not sensitive).

**Troubleshooting:** if Connect shows "Outlook is not configured yet", open `https://YOURSITE/api/status` and check for `"outlookConfigured": true`. If false, you haven't redeployed since adding the variables, a key name is misspelled, or the Scopes exclude Functions/Runtime. If Microsoft shows a redirect mismatch, make sure the Azure redirect URI matches `MS_REDIRECT_URI` exactly. If Microsoft shows **AADSTS50194** ("not configured as a multi-tenant application"), the app was registered single-tenant but the connector uses `/common` — either set the app's account types to "any organizational directory and personal Microsoft accounts" (Authentication blade), or set `MS_TENANT` to your Directory (tenant) ID and redeploy.

Tokens are stored server-side in Netlify Blobs under a private key that no endpoint exposes. The send endpoint has no separate password, so keep your site URL private.

### Scheduling emails

Once Outlook is connected, the email composer gains a **Schedule…** button. Pick a time and the email is queued in a private `outbox` key; a scheduled function (`outlook-dispatch`) runs every 5 minutes and sends anything due (full HTML, links intact, saved to Sent) — so it goes out within ~5 minutes of the chosen time. Manage queued sends from the **Scheduled emails** panel (Cmd+K → "Scheduled emails"). Works only once deployed to Netlify, since the timer runs there.

---

## Branding & customization

Most branding is handled in-app by the setup wizard and **Settings**. If you want to go
further in the code:

- **App name / PWA**: `public/manifest.webmanifest` and the `<title>` in `public/index.html`.
- **Icons / favicon**: replace the files in `public/` and `public/icons/`.
- **Sales playbook**: edit `public/playbook.html`.
- **Theme defaults**: the CSS variables near the top of the `<style>` block in `public/index.html`.

---

## Notes

- All data lives in your own Netlify Blobs store. There is no external database and no
  third-party analytics.
- The app is a single HTML file plus serverless functions — easy to read, fork, and extend.
- Theme (light/dark), the signed-in user, and a cached copy of your branding are stored
  per-device in `localStorage`; the shared workspace itself is stored server-side.
