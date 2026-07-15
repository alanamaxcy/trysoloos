# Good Work Hub

A single-file internal tool that replaces ClickUp for Good Work. It runs on Netlify with Netlify Blobs for shared storage, so you, Vi, and Athena all see the same live workspace.

Seeded with your real ClickUp export: 86 pipeline leads ($102,550 closed-won), the Pathway to Home project with imported time logs, 79 people, and 11 to-dos.

## New in this version

The most recent additions: a full mobile pass so the whole app works on a phone and can be saved to your home screen like a real app (with your Good Work logo as the icon), a read-only Microsoft 365 calendar feed (publish your Outlook calendar and your real events show up in the Calendar view), project workspace polish (Tasks is the default tab, the header is collapsed to reclaim space, columns scroll sideways, and column headers highlight on hover), a creative focus timer that fills a bar across the bottom of the screen with a matching widget on My Day, drag-and-drop for docs and folders, and a project Docs wiki with real working documents instead of just stored links. Before that came a persistent top bar (clock, focus timer, calculator, wellness), a project Meetings tab, a habit tracker and weekly goals on My Day, a Notes notebook (the old Journal), and a social media planner. Each has its own section below. Earlier in this version came deeper customization and table polish, all backed by your shared workspace:

- Editable stages and statuses. Settings now has a Stages and statuses panel. Rename, recolor, reorder, add, or remove pipeline stages and project and to-do statuses. Each one is tagged as In play, Won, Lost, or Done so revenue and progress numbers stay correct when you change things. Changes apply everywhere at once.
- A much larger set of custom field types: text, long text, number, money, progress (a percent slider), rating, dropdown, labels (multi-select), date, checkbox, link, email, and phone. Add them per board in Settings.
- More default fields out of the box. Pipeline starts with Org Type, Decision Maker, and Proposal Link. Project tasks start with Billable, Est. Hours, and a Start Date. To-dos start with an Area field (Client Work, Business Development, Marketing, Admin, Personal).
- Resizable columns. Hover a column edge in any list and drag to set the width. Widths are saved per board.
- Reorderable groups. When a board is grouped (for example the pipeline by stage), hover a group header, grab the dotted handle, and drag to set the order. Saved per board.
- Layout buttons replace the old layout dropdown. Every board now has List, Board, Calendar, and Timeline buttons. Group, sort, and filter stay where they were.
- A Timeline (Gantt) view. Items with dates plot on a horizontal timeline, grouped the same way your list is. Items with a Start Date show as bars, due-only items show as milestone diamonds, and today is marked.
- Click anywhere on a row to open it. You no longer have to use the three-dot menu.
- Docs: a preloaded emoji picker for the page icon (pick instead of typing), and pressing Enter on an empty bullet, number, or to-do line now drops you back to a normal paragraph.
- Branding: the browser tab reads Good Work Hub with a dark blue icon (HQ is reserved for the Impact software).

### Exports and reports

Every list (Pipeline, Projects, To-Dos, People) now has an Export button that gives you three choices:

- Excel (.xlsx). A clean spreadsheet with proper column widths, your custom fields included, money and hours as real numbers. If your network blocks the spreadsheet library, it falls back to a clean CSV automatically.
- CSV. Same data as a plain comma file.
- Print / Save as PDF. A branded, printable version of the list. Use your browser's print dialog and choose Save as PDF.

Projects also have a Time report button. Pick a month and it produces a one-click, print-ready PDF with the Good Work letterhead: total and billable hours, hours by task, and a dated detail log. Billable hours come from the Billable field on tasks (added by default); if a task is not marked billable it is left out of the billable total.

### Tasks across pipeline, projects, and to-dos

Tasks now flow into one place. Open a lead in the Pipeline and you will see a Next steps box: add the next action with a due date and it lands in your To-Dos automatically, tagged with the Sales area, and shows up in Today and My Day when it is due today. This is what makes the pipeline action-oriented instead of just a set of stages.

The To-Dos view is now unified. It shows your personal to-dos, your lead next-steps, and every task from your client projects, each with a Source column telling you where it came from (Personal, Sales, or the project name). Click the Source badge to jump to where the task lives. To keep it from getting noisy, group by Source to collapse everything into Personal / Sales / one section per project, or use the existing group, sort, and filter controls. Editing a task here updates the real task in its project or lead.

A note on automation: the pieces that would notify you (Slack) or email a client (SendGrid) when a step is added or a due date passes are set up in Automations. Making them actually fire needs your webhook URL and API key wired into a Netlify function. The rules engine is already in the app; the outbound connection is the part you set up.

### Goals

Goals now have their own view, separate from day-to-day tasks. Weekly, monthly, lead, and annual goals live in Goals (grouped by goal type), and they no longer clutter your To-Dos list. Add a goal with the New goal button or by typing into a goal-type group.

### Views

Each board now switches layouts from the tabs at the top: List, Board, Calendar, and Timeline. The old duplicate layout buttons are gone. The row beneath the tabs keeps Group, Sort, and Filter. The plus button adds a custom saved view, which starts in whatever layout tab you are currently on.

### Notes (a quick-note notebook)

The old Journal is now Notes: a quick-capture notebook instead of a dated log. A sidebar lists your notes, each with a title and a freeform body that saves as you type. Hit "+ New note" to start one, pin the ones you want at the top, and delete the rest. Any dated entries from the old Journal are carried over as notes titled by date, so nothing is lost. A freeform whiteboard is a possible future direction; for now Notes is a fast, reliable text notebook.

### Project workspaces

Each project is now a full workspace, not just a task list. It opens on Tasks by default, the project name and stats sit in the page header (with project actions tucked into a More menu so the first task row is near the top), and wide task lists scroll sideways so you can reach far-right columns. Open Projects and pick a project to get five tabs:

- Overview: a dashboard with percent complete, open task count, total and this-month hours, a status breakdown bar, plus overdue and due-this-week lists you can check off.
- Tasks: the full board (List, Board, Calendar, Timeline) with time tracking, exactly as before.
- Meetings: a log of your meetings with that client. Each meeting has a date, title, and notes, plus action items. Add an action item and it becomes a real task on the project, showing on the Tasks board and flowing into your To-Dos and My Day. "Import notes" pastes a transcript from Fathom, Otter, or Zoom and turns the action items into project tasks automatically.
- Notes: a rich notes pad for decisions and scope. "Draft status update" uses Claude to write a client-ready summary from the task list.
- Docs: a real working wiki for the project (see its own section below). Each project gets its own set of documents, written in the same block editor as the global Docs, with a Links and files panel kept alongside for proposals, contracts, and Drive folders.

Two more workspace features: "Client one-pager" prints a clean, branded project update (percent complete, hours, key dates, summary) you can hand to a client, and on a closed-won lead in the Pipeline you'll see "Create project from this deal," which spins up a workspace carrying the client name, contract value, and proposal link.

### Top bar tools

Because you usually run full screen and can't see the Mac menu bar, the top of every page now carries a small toolbar on the right: the date and time, a focus timer, a calculator, and a wellness button. The focus timer is a simple Pomodoro you can set to 5, 15, 25, or 50 minutes; it counts down in place and stays visible on every screen, so a running session is always in view. The calculator is a quick popover. The heart button opens a one-tap wellness log tied to your habits. The client-work time tracker still appears in its own bar across the top whenever a timer is running.

The focus timer is also creative: when a session is running, a thin terracotta bar fills across the very bottom of the screen as time elapses, so you always have an ambient sense of progress without watching a clock. My Day has a matching hero widget with a big countdown, a filling progress bar, length presets, and play, pause, and reset. The two stay in sync.

### Habit tracker and weekly goals on My Day

My Day now shows your habits with a current streak for each, so the small daily things stay in view. It starts with a few wellness habits (water, a stand or stretch break, a short walk); add your own with "+ Add," choose whether each is a simple daily check or a count toward a target, and remove any you don't want. My Day also surfaces this week's goals as a subtle reminder strip, pulled from to-dos in the Weekly Goals category. The wellness button in the top bar logs the same habits.

### My Day pulls in everything, including overdue

My Day is meant to be the one place you start your day, so it draws from every task source: to-dos, tasks across all projects, and follow-ups from the pipeline. On top of today's items it now shows an Overdue section, so anything past due surfaces here instead of getting lost. Checking something off updates the real record everywhere.

### The project Docs wiki

The project Files tab is now a real wiki, not a link list. Each project carries its own set of documents written in the same Notion-style block editor as the global Docs: a title and icon, then blocks for headings, text, bullet and numbered lists, to-do checkboxes, quotes, code, and dividers, with the slash menu and "Draft with AI." A sidebar lists the project's documents so you can keep a brief, meeting notes, a scope doc, and a running log side by side. A Links and files panel stays in the sidebar for proposals, contracts, and Drive folders, so nothing from the old tab is lost.

### Drag-and-drop for docs and folders

In Docs, you can now drag a document to reorder it, drag it onto a folder to file it there, drag it onto the area at the bottom to pull it back out, and drag folders to reorder them. Drop targets highlight as you go.

### Social media planner

A dedicated space to plan, write, and schedule social content. It opens as a board with four columns (Idea, Draft, Scheduled, Posted); each card shows the platform, a preview, and a schedule date. Click a card to write the post, set the platform and status, pick a date, and use "Draft with Claude" to draft or tighten the copy in plain language. A Calendar tab lays your scheduled and posted content out by date, and the platform chips filter the view. Posts are yours to start from scratch; nothing is pre-filled.

### Docs folders

Docs can be organized into folders. Use the folder button in the Docs sidebar to create one, and the folder button on any document to file it. Folders are collapsible, and documents without a folder stay in an Ungrouped section.

### Import meeting notes (AI)

In Docs, "Import meeting" lets you paste notes or a transcript from Fathom, Otter, Zoom, Granola, or your own rough notes. Claude pulls out a short summary and the action items; you pick which items to keep, then it saves a note to a Meetings folder and turns each checked item into a to-do. Needs your Claude API key (see AI features).

### Task dependencies

A project task can depend on another. Open a task and set "Depends on (predecessor)." On the Timeline, tasks with a predecessor show a chain marker, and turn amber if they're scheduled to start before the predecessor is due, so you can spot at-risk sequencing. (Drawn arrows between bars are the one visual piece still to come; the dependency data and the at-risk flag are live.)

### Connections

Settings now has a redesigned Connections area: a grid of cards for QuickBooks, Slack, Email, Claude, Google Workspace, and Microsoft 365. Each card shows a live status pill, and clicking a card opens a setup panel with numbered steps, the exact environment variable names to copy, and where relevant the precise redirect URL to paste into the provider. Secrets always live in your Netlify environment variables; the app never stores or displays them.

The status pills are real. A small function (`/api/status`) reports which integrations are configured, based only on whether the environment variables are present (and, for QuickBooks, whether you have completed the connect step). It returns booleans, never the secrets themselves. Before you deploy, the pills read "Deploy to check"; after deploy they show Connected, Ready, or what is still missing.

What each one needs:

- Claude: set ANTHROPIC_API_KEY in Netlify. The setup panel has a Test button that confirms the proxy is working.
- Slack: create a Slack incoming webhook and set SLACK_WEBHOOK_URL. The panel's "Send test message" posts to your channel, and there is a toggle to let automations post alerts. The "Ping Slack when you win a deal" automation fires on Closed Won.
- Email (SendGrid): set SENDGRID_API_KEY and SENDGRID_FROM (a verified sender). The panel's "Send test email" sends to an address you enter. You can also set a display From name.
- QuickBooks: create an Intuit app, then set QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REDIRECT_URI, and QBO_ENV (set to production for live data). The panel shows the exact redirect URL to add to your Intuit app (your site origin plus /api/qbo-callback). Then Connect runs the OAuth flow and "Sync revenue" pulls year-to-date income into your goal. This one needs testing on your live site with your account; the OAuth flow could not be tested here.
- Microsoft 365: the calendar is connected, read-only, through a published Outlook link. Publish your calendar in Outlook, paste the ICS link into the Microsoft 365 card, and your events show up in the Calendar view alongside your tasks and follow-ups. There is no Azure setup. Email, and writing events back to Outlook, are not part of this; that would be the full Microsoft Graph build.
- Outlook Email (send): send email drafts straight from your own mailbox through Microsoft Graph. Real HTML, so hyperlinks stay clickable, the message comes from your address, and a copy lands in your Sent folder. This is the full Graph connection (separate from the read-only calendar card) and needs a one-time Azure app registration — see "Outlook email setup" below. Once connected, the email composer in the Pipeline gains a "Send via Outlook" button.
- Google Workspace: honestly marked as planned. The card and setup panel are built, but the backend OAuth is not wired yet, so it does not sync today. The panel explains what it would need.

### Mobile and home screen

The app is built to work on a phone and to be saved to your home screen, where it opens full screen like a native app.

- On a phone, the sidebar is hidden and opens as a slide-in menu from a button in the top left. Tapping a destination closes it. The page header, action buttons, and drawers all reflow to fit a narrow screen, inputs are sized so iOS does not zoom in when you tap them, and the layout respects the notch and home indicator.
- To install it: open the deployed site in Safari (iPhone) or Chrome (Android), choose Share or the menu, then Add to Home Screen. It launches in its own window with no browser bar.
- The home-screen icon is your white Good Work logo on a charcoal blue tile. This is wired through a web manifest (`public/manifest.webmanifest`) and icon files in `public/icons`, plus an Apple touch icon. The browser tab favicon is your logo too.
- One note: the home-screen install reads the manifest and icons from the deployed Netlify site. Opening the single standalone HTML file by itself still works and still shows the logo in the tab, but the home-screen install flow is meant for the deployed site.

### Revenue: how "earned so far" is calculated

The dashboard tracks earned revenue against your goal. In Settings you choose the source: automatically from your closed-won deals (the default), or entered manually (which is also what QuickBooks "Sync revenue" fills in).

### How the progress field works

There are two ways to track progress, and it is worth knowing the difference:

- The built-in Progress column on tasks is automatic. It is the share of a task's subtasks that are checked off. Add subtasks and check them, and the bar fills on its own.
- The new Progress custom field is manual. Add a field of type Progress to any board, then click the cell and drag the slider to whatever percent you want. Use this when there are no subtasks to count, or when you just want to set a number by hand.

## What's inside

- `public/index.html` is the entire app (HTML, CSS, JS, and your data embedded). This is what people open.
- `netlify/functions/data.mjs` reads and writes the shared workspace document in Netlify Blobs.
- `netlify/functions/claude.mjs` is a small proxy that powers the AI features. It reads `ANTHROPIC_API_KEY` from your Netlify environment and never exposes the key to the browser.
- `netlify/functions/notify.mjs` sends Slack messages and SendGrid emails. `netlify/functions/qbo-connect.mjs`, `qbo-callback.mjs`, and `qbo-revenue.mjs` handle the QuickBooks OAuth flow and revenue sync. `netlify/functions/status.mjs` reports which integrations are configured, returning booleans only (never secrets). `netlify/functions/ics.mjs` fetches your published Outlook calendar feed and returns the events as JSON, so the browser can show them without hitting cross-origin limits. `public/manifest.webmanifest` and `public/icons` provide the home-screen app name and icons.
- `netlify.toml` is the Netlify config (publish `public`, functions in `netlify/functions`).
- `package.json` has one dependency, `@netlify/blobs`, installed automatically on deploy.

## Deploy (drag and drop)

1. Deploy this folder: Netlify, Add new site, Deploy manually, drop the folder.
2. Netlify installs `@netlify/blobs`, publishes `public/`, and wires up `/api/data` and `/api/claude`.
3. Open the site. First load seeds your data into Blobs and writes it back, so it persists from then on.
4. Rename the site to whatever subdomain you want under Site settings. No code change needed.

## Deploy (Git)

Push this folder to a repo and connect it in Netlify. Build command can be blank. Publish directory is `public`. Functions directory is `netlify/functions`. Both are already set in `netlify.toml`.

## Signing in

Three users: alan, vi, athena. The password is the first name in lowercase. This isn't real security. It identifies who you are so time tracking and lead ownership get attributed correctly. On the sign-in screen you can click your name instead of typing it.

## Quick find (Cmd+K)

Press Cmd+K (Ctrl+K on Windows) anywhere, or click Quick find at the top of the sidebar. It jumps to any view, runs quick actions (new lead, to-do, project, doc, run automations), and searches across your leads, tasks, to-dos, and docs. Type, arrow to a result, Enter to open. It's the fastest way to move around once the workspace fills up.

## The boards (Pipeline, Projects, To-Dos)

All three share the same engine, so they all do the same powerful things:

- **Views.** Each board starts with a default view. Add as many as you want with the `+` tab (for example a "Hot leads" view, a "This week" view, a "By owner" board). Each view remembers its own layout, grouping, sort, filters, and visible columns. Delete a view with the small x on its active tab.
- **Layouts.** Switch any view between List, Board (kanban), and Calendar from the Layout control. Kanban cards drag between columns and the underlying field updates. Calendar plots items by whichever date field you choose.
- **Group by anything.** Status, priority, owner, stage, category, tier, source, and any dropdown custom field you create.
- **Sort, filter, columns.** Multi-value filters with chips you can clear, ascending or descending sort, and per-view column show/hide.
- **Rows.** Inline edit, expandable subtasks with automatic progress rollup, bulk select with an action bar, and a row menu (the dots) for Open, Duplicate, Move to another group, and Delete. Lead delete lives here now.
- **Add inline.** Every group has an add row, and to-do category changes inline from the row.

## Custom fields

Settings, Custom fields. Add your own columns to Pipeline, Project tasks, or To-Dos. Types: text, number, dropdown, date, checkbox. Dropdowns support colored options (type `Label #hex` per line, or let it auto-color). A new field immediately becomes a column, a sort option, and for dropdowns a group-by and filter option too.

## Pipeline

A real CRM, not a basic list. Each lead has contract and annual value, budget tier, owner, services, lead source, referral, an activity log, and follow-up dates. The health indicator flags deals going cold (no contact for 21+ days), overdue follow-ups, and active deals. Logging activity sets last contact to today. Group by stage for a weighted funnel, by owner for workload, or by any custom field.

## Projects

Per-project tabs. Tasks carry a start/stop timer. Imported ClickUp time shows as imported and new sessions stack on top. The same views, grouping, and custom fields apply. Add a task with `Category: Task name` to drop it straight into a group.

## People

Your roster grouped by relationship (Core Team, Network Members, Invited to PLC, Contractors, and so on), with in-network and priority flags, search, and notes for subcontracting fit.

## My Day, Docs, Notes, Social

The old "Personal" grouping is gone. My Day now lives under Workspace, and Docs, Notes, and the Social planner sit under a Create section.

- **My Day** is a clean, minimal daily list. It pulls today's to-dos and tasks, checkboxes sync back to the real records, and a quick-add drops a new item onto today. It also shows this week's goals and your habit streaks, and there's a focus-notes scratch area that saves as you type.
- **Docs** is a Notion-style editor. Create docs, give them an emoji and title, and build them from blocks: headings, text, bullet and numbered lists, to-do checkboxes, quotes, code, and dividers. Type `/` on an empty line for the block menu.
- **Notes** is a quick-note notebook: titled notes with a freeform body, pinning, and instant capture. Old dated Journal entries are carried over.
- **Social** is the social media planner described above.

Everything here saves to the same shared workspace.

## Reports

Drill into the numbers: revenue versus goal, pipeline by stage, value by stage, leads by source, pipeline health, time by project, and to-do progress, drawn as live bar and donut charts from your actual data. There's an AI insights panel (see below).

## Automations

Condition-based rules that scan your live pipeline and act for you. Add from templates (flag cold leads, set follow-ups, nudge when a proposal is needed, and so on), toggle them on and off, and run them on demand. They also run when you open the page and every 90 seconds. Every action is logged on the same page and is fully reversible. Each rule only acts once per item, so nothing gets spammed.

## AI features (needs an API key)

The AI insights on Reports, the "draft with AI" action in Docs, and the Test button in Settings all call Claude through the `claude.mjs` function. To turn them on:

1. Netlify, Site settings, Environment variables.
2. Add `ANTHROPIC_API_KEY` with your Anthropic key.
3. Redeploy.

Until then the app runs fine and the AI panels show a clear message telling you exactly what to add. The key stays server-side and is never sent to the browser.

## Sync model

The whole workspace is one JSON document. Every change saves to Blobs after about half a second, and each client polls every five seconds and adopts a newer version. This is last-writer-wins, which is right for three people. Your running timer is stored per device, so a teammate's save can't wipe a timer you have going, and two of you can track different tasks at once.

## Your data

Settings, Your data. Download a full JSON backup any time, or restore from one. Every board also has a CSV export.

## Outlook email setup (Microsoft Graph)

This lets the app send email from your own Outlook / Microsoft 365 mailbox, with full HTML so hyperlinks stay clickable. It's a one-time setup (about 10 minutes): register a small app with Microsoft, then add three environment variables in Netlify.

1. Go to the Microsoft Entra admin center (entra.microsoft.com) -> App registrations -> New registration.
2. Name it "Good Work HQ". Under supported account types, choose "Accounts in any organizational directory and personal Microsoft accounts." Click Register.
3. On the app's Overview page, copy the Application (client) ID -- that's your MS_CLIENT_ID.
4. Go to Authentication -> Add a platform -> Web. For the Redirect URI, enter your site origin plus /api/outlook-callback, exactly -- for example, https://YOURSITE.netlify.app/api/outlook-callback. Save.
5. Go to API permissions -> Add a permission -> Microsoft Graph -> Delegated permissions. Add Mail.Send, User.Read, and offline_access. (A personal Outlook.com account needs no admin consent; a work tenant may require an admin to grant consent.)
6. Go to Certificates & secrets -> New client secret. Copy the secret's Value immediately (not the Secret ID) -- that's your MS_CLIENT_SECRET.
7. In Netlify, go to Site settings -> Environment variables and add three variables. For each, click "Add a variable", leave Scopes on "All scopes" and Values on "Same value for all deploy contexts", then set the key and value:
   - Key: MS_CLIENT_ID -- Value: your Application (client) ID (the GUID from the app's Overview page). Not sensitive; leave the "secret" box unchecked.
   - Key: MS_CLIENT_SECRET -- Value: the client secret Value you copied in step 6 (the Value column, NOT the Secret ID). Check the "contains a secret value" box so Netlify keeps it hidden.
   - Key: MS_REDIRECT_URI -- Value: your redirect URL from step 4, e.g. https://goodworkhq.co/api/outlook-callback. Not sensitive; leave unchecked.
   - (optional) Key: MS_TENANT -- Value: common. This is the default; only add it if you need to restrict to a single tenant.
8. Redeploy the site -- this step is required. Environment variables only take effect on a NEW deploy, so saving them is not enough on its own. In Netlify: Deploys -> Trigger deploy -> Deploy site, and wait for it to finish. Then open Settings -> Connections -> Outlook Email -> Connect Outlook and approve the permissions. Use "Send test to myself" to confirm.

Troubleshooting: if Connect shows "Outlook is not configured yet", the functions are not seeing the variables. Open https://YOURSITE/api/status in your browser and look for "outlookConfigured": true. If it is false: you have not redeployed since adding the variables, or a key name is misspelled, or the variable Scopes do not include Functions/Runtime ("All scopes" covers it) -- fix and redeploy. Separately, if Connect starts but Microsoft shows a redirect-mismatch error, make sure the redirect URI in your Azure app registration matches MS_REDIRECT_URI exactly, character for character. If Microsoft shows AADSTS50194 ("not configured as a multi-tenant application"), your app was registered as single-tenant but the connector uses the /common endpoint -- either change the app's supported account types to "Accounts in any organizational directory and personal Microsoft accounts" (App registration -> Authentication -> Save), or pin it to your tenant by setting MS_TENANT to your Directory (tenant) ID in Netlify and redeploying.

Security: tokens are stored server-side in Netlify Blobs under a private key that no endpoint exposes (same approach as QuickBooks). The send runs in a serverless function (/api/outlook-send) that refreshes the access token as needed and calls Graph's sendMail with saveToSentItems on. Like the rest of this workspace, the send endpoint has no separate password, so keep your site URL private; adding per-user auth to the functions is a sensible future step.

## Scheduling emails

Once Outlook is connected, the email composer gains a "Schedule..." button next to "Send via Outlook". Pick a date and time and the email is queued; it goes out from your Outlook mailbox automatically when its time comes (full HTML, links intact, saved to Sent). Because Microsoft Graph has no native "send later", this runs as a small server-side scheduler: queued emails live in a private "outbox" key in Netlify Blobs, and a scheduled function (netlify/functions/outlook-dispatch) runs every 5 minutes and sends anything due -- so a scheduled email goes out within about 5 minutes of its target time. View, cancel, or "Send due now" from the "Scheduled emails" panel (Cmd+K -> "Scheduled emails"). Scheduling only works once the site is deployed to Netlify, since the timer runs there.

## Honest notes on what needs more setup

- **Microsoft 365 calendar.** Connected, read-only, through a published Outlook calendar link (no Azure setup). Publish your calendar in Outlook, then paste the ICS link into the Microsoft 365 card in Settings. Events appear in the Calendar view in Outlook blue. Two caveats: the feed refreshes on Microsoft's schedule (often every few hours, not instantly), and the published link is viewable by anyone who has it, so keep it private. Email, and writing events back to Outlook, are not included; that would be the full Microsoft Graph build (Azure app registration plus OAuth).
- **Claude AI.** The proxy is real and working. It just needs the `ANTHROPIC_API_KEY` environment variable above.
- **Geospatial mapping** on Reports is a labeled placeholder for now. Plotting your leads or clients on a map needs geocoded addresses and a map library, which we can add when you want it.
- **Gantt** isn't a separate layout yet. Calendar and Board cover most of what you'd use it for. If you want a true timeline with dependencies, that's a future add.

## Changing the revenue goal

It defaults to $150,000 and is editable in Settings, Revenue goal. It feeds the dashboard and Reports.
