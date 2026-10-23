# BunkWise

**BunkWise** is an intelligent student academic companion and attendance tracker engineered for students using the SchoolPad / ChalkPad Pro university ERP portal (Chitkara University and affiliated institutions).

Featuring real-time attendance margin calculations, interactive "safe bunk" projections, timetable derivation, offline demo preview, and a modern mobile-optimized dark/light UI.

---

## Features

- **Attendance Intelligence:** Calculates exact attendance percentages using official class delivery metrics rather than unweighted averages.
- **Bunk & Recovery Simulator:** Real-time projection of how many lectures can be safely missed without falling below the target threshold (default 75%), or how many consecutive classes are needed to recover.
- **Subject Register & Calendar:** Day-by-day lecture records with status codes (`P` Present, `A` Absent, `DL` Duty Leave, `ML` Medical Leave).
- **Derived Weekly Timetable:** Reconstructs weekly schedules from historical attendance timestamps when official timetable endpoints are unpopulated.
- **Academic Results & Circulars:** In-app notice attachment viewer (PDF reader) and semester-by-semester SGPA tracking.
- **Offline Demo Mode:** Complete synthetic student profile and demo curriculum for offline testing without university ERP credentials.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [npm](https://www.npmjs.com/) v9.0.0 or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/bunkwise.git
   cd bunkwise
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

---

## Environment Variables

| Variable | Scope | Description | Default / Example |
|---|---|---|---|
| `VITE_DEFAULT_SCHOOL_CODE` | **Public** (Client) | Default institute code | `800002` |
| `VITE_APP_NAME` | **Public** (Client) | App display title | `BunkWise` |
| `FEEDBACK_WEBHOOK_URL` | **Private** (Server-only) | Optional webhook endpoint for student feedback submissions | `None` |

> [!IMPORTANT]
> Variables prefixed with `VITE_` are bundled directly into the public client JavaScript. **Never put private server secrets, API passwords, or tokens in `VITE_` variables.**

---

## Development & Testing

### Run Development Server
```bash
npm run dev
```
Starts the Vite local development server with an integrated SchoolPad ERP forward proxy on `http://localhost:5173`.

### Run Test Suite
```bash
npm test
```
Executes the Vitest unit tests verifying attendance percentage math, bunk calculations, date math, and ERP endpoint diagnostics.

### Build for Production
```bash
npm run build
```
Typechecks via `tsc` and compiles optimized production assets into the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

---

## Deployment (Vercel)

BunkWise includes a pre-configured serverless proxy (`api/proxy.js`) and routing definitions (`vercel.json`) optimized for zero-config Vercel deployment:

1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Configure serverless environment variables in the Vercel Project Settings (under **Environment Variables**):
   - Set private variables like `FEEDBACK_WEBHOOK_URL` as **Production / Preview** server variables.
6. Deploy!

---

## Security & Student Privacy

- **Zero Search Indexing:** Authenticated student pages and portal interfaces are excluded from search crawlers via `robots.txt` (`Disallow: /`) and `<meta name="robots" content="noindex, nofollow" />`.
- **SSRF Hardened:** The proxy gateway enforces a strict hostname allowlist, only permitting approved university ERP endpoints (`*.codebrigade.in`, `*.schoolpad.in`, and AWS S3 attachment CDNs).
- **Zero Third-Party Tracking:** No Google Analytics, session recorders, or third-party cookies are loaded, ensuring student marks, roll numbers, and attendance records remain strictly private.

---

## Credits

`Made by Vishal (CSE'25)`
