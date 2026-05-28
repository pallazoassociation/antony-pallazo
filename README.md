# 🏛 Antony Palazzo – Apartment Management App

Mobile-first apartment management application for **Antony Palazzo** — a 30-unit residential complex (Blocks A–F, 1BHK / 2BHK / 3BHK).

---

## ✅ Prerequisites

- **Node.js** v18+ — https://nodejs.org
- **npm** (comes with Node)

---

## 🚀 Quick Start

```bash
# 1. Enter the project folder
cd antony-palazzo

# 2. Install dependencies (one time)
npm install

# 3. Start the development server
npm run dev
```

The app will open at **http://localhost:3000** in your browser.

> 💡 For the best mobile experience, open Chrome DevTools → Toggle device toolbar → Select a phone like **iPhone 14** or **Pixel 7**.

---

## 📦 Build for Production

```bash
npm run build     # Outputs to /dist folder
npm run preview   # Preview the production build locally
```

---

## 📱 App Features

| Tab        | What it does |
|------------|--------------|
| 🏠 Home     | Admin dashboard — collection summary, quick actions, defaulter list |
| 🏢 Flats    | All 30 flats — search, filter by status/type, tap for details |
| 📊 Reports  | Financial summary + 8 exportable reports (PDF + Excel) |
| 📋 Notices  | Notice board — post, view, resend via WhatsApp |
| 💳 Expenses | Monthly expense tracker by category |

### Flat Detail Panel
- Outstanding balance with arrears breakdown
- Resident info (Owner + Tenant if rented)
- Payment history with receipt references
- Actions: Record Payment, Send Bill, Download Receipt, Send Reminder

### Record Payment Flow
- Select amount, mode (Cash / UPI / NEFT / IMPS / Cheque), reference ID
- Flat status updates in real time (Overdue → Paid)
- Toast confirmation simulating WhatsApp receipt delivery

---

## 🏗 Project Structure

```
antony-palazzo/
├── index.html          # HTML entry point
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies & scripts
└── src/
    ├── main.jsx        # React DOM mount
    └── App.jsx         # Entire app (data + components + styles)
```

---

## 🔧 Tech Stack

- **React 18** — UI components
- **Vite 5** — Development server & bundler
- **CSS-in-JS** — Injected `<style>` tag; no CSS files needed
- **Google Fonts** — Playfair Display + DM Sans (loaded via CDN)

---

## 📊 Pre-loaded Data

- All **30 flats** (Blocks A–F) with real charges per BRD
- **Resident profiles** for all flats (owners + tenants)
- **Live payment statuses** — Paid / Partial / Overdue / Vacant
- **5 notices**, **6 expense entries**, **payment history** for select flats

---

## 📋 Business Requirements Reference

Built to spec from: `Apartment_Management_App_BRD_v2.docx`

Monthly collection target: **₹54,600** (29 active flats)  
Annual target: **₹6,55,200**

| Type  | Flats | Charge/month |
|-------|-------|-------------|
| 1 BHK | 5     | ₹1,600      |
| 2 BHK | 17    | ₹1,800      |
| 3 BHK | 8     | ₹2,000      |

---

*Antony Palazzo Apartment Management App — May 2026*
