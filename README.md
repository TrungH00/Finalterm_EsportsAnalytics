# Finalterm_EsportsAnalytics
🚀 Esports Management & Analytics System
A full-stack system for managing esports teams, player performance, and analytics using SQL Server and MongoDB.

**🧠 Overview**
This project demonstrates a hybrid data architecture:
Relational DB (SQL Server) → team, player, roster management
NoSQL (MongoDB) → match analytics (KDA, performance tracking)
Backend (Node.js) → REST API
Frontend (React) → Dashboard UI

**🏗️ System Architecture**
React (Frontend)
       ↓
Node.js (Express API)
       ↓
SQL Server (Relational Data)
MongoDB (Analytics Data)

**🛠️ Tech Stack**
Microsoft SQL Server
MongoDB
Node.js
Express.js
React

**⚙️ Installation & Setup**
1️⃣ Setup SQL Server
-Create Database
CREATE DATABASE esports_db;
-Run SQL Scripts (in order)
01_schema.sql
02_seed_data.sql
03_trigger_roster.sql
04_leaderboard.sql

✅ Expected output:
Command(s) completed successfully.

🔐 Enable SQL Authentication
1. Open SSMS → localhost\SQLEXPRESS → Properties
2. Tab Security → Select:
SQL Server and Windows Authentication mode
3. Go to:
-Security → Logins → sa
-Password: 123456789
-Status: Enabled
4. Restart SQL Server:
services.msc → SQL Server (SQLEXPRESS) → Restart

2️⃣ Setup MongoDB (Seed Data)
cd 2_NoSQL_Analytics
npm install mongodb
node 01_seed.js

✅ Expected:
Insert thành công: 22 documents

3️⃣ Run Backend API
cd Backend_API
npm install
node server.js

✅ Expected:
✓ Server running at http://localhost:3000
✓ SQL Server  : connected
✓ MongoDB     : connected

4️⃣ Run Frontend
cd Frontend_UI
npm install
npm start

👉 Open:
http://localhost:3001

**📊 Features**
🏆 Leaderboard System
📈 KDA Analytics (MongoDB)
👥 Roster Management (Trigger-based)
🔗 Hybrid Database Integration
⚡ Real-time API communication

**🔌 API Endpoints (Sample)**
Method	Endpoint	Description
GET	/leaderboard	Get ranking
GET	/kda	Player analytics
POST	/roster	Add player

**📁 Project Structure**
.
├── 1_SQL_Database
├── 2_NoSQL_Analytics
├── 3_System_Architecture
├── 4_Backend_API
└── 5_Frontend_UI

**⚠️ Notes**
SQL Server must enable SQL Authentication
Ensure MongoDB is running before seeding
Default ports:
Backend: 3000
Frontend: 3001

**🎯 Learning Outcomes**
Hybrid database design (SQL + NoSQL)
RESTful API development
Data modeling & triggers
Full-stack integration
