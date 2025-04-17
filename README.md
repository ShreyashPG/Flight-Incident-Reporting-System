# ✈️ Flight Incident Reporting System

## 🧾 Overview

A full-stack web application for reporting and managing flight incidents. Built with **React**, **Node.js**, **MongoDB**, and **TailwindCSS**, it supports:

- Role-based access (Crew, Pilot, Admin, Ground Staff, Auditor)
- Secure session management with **HTTP-only cookies**
- Rule-based incident classification (simulated AI)
- Advanced features: Excel export, action tracking, and inline editing

---

## 🛠️ Setup

### 🗄️ MongoDB

Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or local MongoDB.

Update `backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/flight_incidents
PORT=5000
JWT_SECRET=your_jwt_secret_here_12345
```

### 🚀 Backend

```bash
cd backend
npm install
npm run start
```

Runs at: [http://localhost:5000](http://localhost:5000)

### 🌐 Frontend

```bash
cd frontend
npm install
npm run start
```

Runs at: [http://localhost:3000](http://localhost:3000)

---

## 🔐 Features

### ✅ Role-Based Access

| Role         | Capabilities                                                                 |
|--------------|------------------------------------------------------------------------------|
| **Crew**     | Report/view own incidents, add comments                                      |
| **Pilot**    | Report/view all incidents, suggest actions                                   |
| **Admin**    | Manage users, assign/edit actions, edit incidents                            |
| **Ground**   | Update action status                                                         |
| **Auditor**  | View/export incidents, edit actions/status                                   |

### 🔒 Secure Session Management

- **MongoDB-based** sessions
- **HTTP-only cookies** (no LocalStorage)

### 📋 Incident Management

- Report with: flight ID, location, description, severity
- Rule-based classification (e.g., "engine" → "Engine Failure")
- Comments include user email (e.g., `"Urgent (by crew@example.com)"`)
- **Inline editing** for Admin/Auditor

### 📤 Excel Export

- Admin/Auditor can export incidents with actions to `.xlsx`

### 🎨 Responsive UI

- Built with **TailwindCSS** for a clean, modern interface

---

## 🧠 Notes

- AI is simulated using rule-based classification due to tokenizer (Rust) issues on Windows
- Planned AI: `facebook/bart-large-mnli` for zero-shot classification
- Sessions via **HTTP-only cookies** provide stronger security than LocalStorage
- Inline editing enhances usability for Admin/Auditor

---

## 🧪 Demo

1. Open [http://localhost:3000](http://localhost:3000)
2. Sign up as different roles (e.g., Admin, Auditor)
3. Try the following:
   - Report incidents (e.g., `"Engine stopped working"` → `Engine Failure`)
   - Add comments (e.g., `"Urgent (by crew@example.com)"`)
   - Edit actions/status inline (Admin/Auditor)
   - Export incidents to Excel
   - Logout and test session cleanup

---

## 📁 .gitignore Example

```gitignore
/node_modules/
/__pycache__/
/package-lock.json
```

---

## 📬 Contributions & Feedback

Pull requests, suggestions, and feedback are welcome!