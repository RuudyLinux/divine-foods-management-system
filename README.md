# Divine Foods — Production, Inventory & Exhibition Management

A management system for Divine Foods: production batches, central warehouse
stock, exhibition stalls, point-of-sale billing, expenses, day-closing
reconciliation and profit reporting.

React 19 + TypeScript + Vite + Tailwind CSS 4.

---

## Deployment status

**This version is a single-device / local-storage deployment.**

Suitable for: one computer or one tablet, used by one stall or one office at a
time, and for client demonstration.

**Not suitable for** shared inventory or shared sales across several devices.
Each device keeps its own separate records — see the next section, which is the
most important thing to understand about this release.

Multi-device operation needs a backend database (Supabase or similar). That is
a deliberate future step, to be taken once the client confirms they need
several people working at once; it would also move authentication to the
server.

---

## Where the data lives — read this first

**All data is stored in the browser it was entered in** (`localStorage`, under
the key `divine_foods_db_v1`). There is no server and no shared database.

That means:

- **Devices do not share data.** The laptop and the stall's phone each keep a
  separate database. A sale rung up at the stall will not appear on the
  office dashboard.
- **Clearing browser data deletes the records.** So does a browser reinstall,
  or using a private window. There is no server-side backup.
- **Storage is capped** at roughly 5 MB for everything, product photos included.
- Deploying to a host does not change any of this. A hosted URL is a
  convenient way to open the app on each device, not a way to share data
  between them.

Use **Settings → Download Database JSON** regularly; it is the only backup.

Moving to shared, multi-device data requires a backend (Supabase, Firebase or
similar), which would also move authentication server-side.

---

## First run

A new installation ships with **no password**. The first person to open the app
is asked to create the administrator password, and nothing else is reachable
until they do.

Deploy first, then open the URL yourself and set the password before sharing
the address.

Accounts are seeded for sign-in:

| Account | Email | Role |
| --- | --- | --- |
| Hardik Vyas (Admin) | `admin@divinefoods.com` | Admin |
| Ramesh Patel | `vadodara@divinefoods.com` | Exhibition user |

Rename them in **Users**. Staff passwords are set by an administrator there,
and each user must choose their own at first sign-in.

Passwords are stored as PBKDF2-SHA256 hashes with a per-account salt, never in
readable form. They cannot be recovered — only reset by a signed-in
administrator.

> Password hashing uses the Web Crypto API, which browsers expose only over
> **HTTPS or localhost**. Serving the built files over plain HTTP on a LAN
> address will prevent anyone from signing in.

---

## Commands

```bash
npm install        # install dependencies
npm run dev        # development server
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm run lint       # TypeScript check, no emit
npm test           # business logic, stock/money and authentication tests
```

No environment variables are required, in development or in production.

On Windows, `start.bat` and `stop.bat` run and stop the development server.

---

## Deployment

The app is a static single-page build. `vercel.json` pins the framework, build
command and output directory, rewrites unmatched paths to `index.html` so a
deep link survives a refresh, and caches fingerprinted assets while keeping
`index.html` fresh.

Any static host works; the rewrite rule is the only requirement.

---

## Project layout

```text
src/
  components/common/    Shared UI: Button, Modal, DataTable, StatusBadge, …
  components/navigation/  Sidebar and header
  context/              Authentication state
  lib/
    db.ts               The data layer: every read, write and calculation
    auth.ts             Password hashing and strength rules
    brand.ts(x)         Palette, formatting, logo
  views/                One folder per area of the app
tests/unit/             Automated checks (24)
```

`src/lib/db.ts` owns the business rules — stock positions, costing, tender
splits and reconciliation. Change calculations there, not in the views.
