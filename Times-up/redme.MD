# Time’s Up – Parental Control Dashboard

Time’s Up is a web‑based parental control system that helps parents track and manage their children’s digital activity.  
It provides real‑time location monitoring, route trails, and activity reports through an interactive dashboard.

---

##  Features
- **Child Profiles:** Add and manage multiple children.
- **Live Location Tracking:** View child’s current position on Google Maps.
- **Route Trails:** Display historical movement with polylines.
- **Activity Reports:** Screen‑time and app usage charts.
- **Rules & Restrictions:** Set parental rules and schedules.
- **Secure Authentication:** Email/password and Google Sign‑In.

---

## Tech Stack
- **Frontend:** React + TypeScript + Vite  
- **UI:** Tailwind CSS + Recharts + @vis.gl/react-google-maps  
- **Backend:** FastAPI / Node.js (deployed on Render)  
- **Database:** PostgreSQL (Render free tier)  
- **APIs:** Maps JavaScript API, Geocoding API, Directions API

---

##  Local Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/naimur-rooted/Times-up.git
   cd Times-up

## Install dependencies:
npm install

## Add environment variables in .env:
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here

## Run locally:
npm run dev

## Deploy on Render (Free Hosting)
Push your project to GitHub (make sure render.yaml is at the root).

Go to Render Dashboard.

Click New + → Blueprint.

Connect your GitHub repo.

Render will detect render.yaml and configure automatically.

Click Deploy.

Render will give you a public URL

## Dashboard Overview
Map Tab: Real‑time location view with route trails.

Activity Tab: Logs of app usage and messages.

Reports Tab: Charts for screen time and activity trends.

Rules Tab: Manage restrictions and schedules.