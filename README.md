Flight Incident Reporting System
Overview
A full-stack web application for reporting and managing flight incidents, built with React, Node.js, MongoDB, and TailwindCSS. It features role-based access (Crew, Pilot, Admin, Ground Staff, Auditor), secure MongoDB-based session management with HTTP-only cookies, rule-based incident classification, and advanced functionalities like Excel export, incident action tracking, and inline editing for Admin/Auditor. The system simulates AI with rule-based classification due to tokenizers dependency issues on Windows.
Setup

MongoDB:
Use MongoDB Atlas or local MongoDB.
Update backend/.env:MONGO_URI=mongodb://localhost:27017/flight_incidents
PORT=5000
JWT_SECRET=your_jwt_secret_here_12345




Backend:
cd backend && npm install && npm run start
Runs on http://localhost:5000.


Frontend:
cd frontend && npm install && npm run start
Runs on http://localhost:3000.



Features

Role-Based Access:
Crew: Report incidents, view own incidents, add comments.
Pilot: Report incidents, view all incidents, suggest actions.
Admin: Manage users, assign actions, view/edit all incidents.
Ground Staff: Update action status.
Auditor: View incidents, export reports, edit actions/status.


Session Management:
Secure MongoDB-based sessions with HTTP-only cookies, replacing LocalStorage.


Incident Management:
Submit incidents with flight details, location, description, and severity.
Rule-based classification (e.g., "engine" → "Engine Failure").
Comments with user email (e.g., "Urgent (by crew@example.com)").
Inline editing for Admin/Auditor (Suggested Action, Assigned Action, Action Status).


Excel Export:
Admin/Auditor can export incidents with actions to Excel.


Responsive UI:
Built with TailwindCSS for a modern, polished look.


MongoDB:
Persistent storage for users, incidents, and sessions.



Notes

AI/ML was simplified to rule-based classification due to tokenizers (Rust) issues on Windows.
Planned AI: Use facebook/bart-large-mnli for zero-shot classification.
MongoDB sessions with HTTP-only cookies enhance security over LocalStorage.
Inline editing for Admin/Auditor improves usability.

Demo

Open http://localhost:3000.
Sign up as different roles (e.g., Admin, Auditor).
Test features:
Report incidents (e.g., "Engine stopped working" → "Engine Failure").
Add comments (e.g., "Urgent (by crew@example.com)").
Edit actions/status as Admin/Auditor inline.
Export incidents to Excel.
Logout to verify session removal.



