# Parental Control System

This repository combines two connected applications that form a complete parental control ecosystem:

- **Time’s Up (Parent Dashboard)** – a web app for monitoring and managing children’s activity.  
- **Family Guardian Child App** – a Flutter mobile app installed on the child’s device.

Together, they enable real‑time location tracking, screen‑time management, and secure communication between parent and child devices.

---

## Project Structure
Parental_Control_System/
│
├── Times-up/                  # Parent dashboard (React + TypeScript)
│   └── README.md
│
└── family_guardian_child_app/ # Child app (Flutter)
└── README.md


---

##  How It Works
1. The **child app** collects location, activity, and device data.  
2. It sends this data securely to the **Time’s Up dashboard** via REST API.  
3. The **parent dashboard** visualizes the data on maps and charts, allowing rule management and alerts.

---

##  Deployment
- **Dashboard:** Deploy on free hosting such as [Render](https://render.com).  
- **Child App:** Build and distribute via APK or publish on Google Play.  

Each sub‑project has its own README with detailed setup and deployment instructions.

---

##  Security Notes
- Keep all API keys in `.env` files
- Restrict Google Maps API to your domain and required services only.  
- Use HTTPS endpoints for all data exchange.

---

## 👨‍💻 Author
**Naimur Rahman (Nahid)**  
Student | Developer | Creator of BilashBari Shop  
📍 Kurigram, Bangladesh  
## 🪪 License
MIT License © 2026 Naimur Rahman
