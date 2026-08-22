# Event Document Generator

**Event Certificate, Poster, Event Report and Attendance Sheet Generator**

Event Document Generator is a MERN stack platform that provides four integrated modules for creating professional event documents with live previews, data management, and export support.

This project includes four main academic document modules:

1. Event Certificate Generator
2. Poster Generator
3. Event Report Generator
4. Attendance Sheet Generator

---

## Developed By

**Pritkumar Koradiya**  
Full Stack MERN Developer

© 2026 Pritkumar Koradiya. All Rights Reserved.  
Unauthorized copying, redistribution, or reuse of this project without proper credit is not allowed.

---

## Project Modules

### 1. Event Certificate Generator

The Certificate Generator allows users to create and manage professional certificates for different events such as seminars, conferences, FDPs, expert talks, workshops, webinars, hackathons, competitions, and more.

#### Features

- Single certificate generation
- 24+ certificate templates
- Image background certificate templates
- Live certificate preview
- Template selection
- Category-based certificate generation
- Authorized signature name support
- Configurable certificate signatures: blank or uploaded image modes for Dr. Niraj Shah and Authorized Person, single-signature placement, and both-signature layout
- Certificate PDF download
- Bulk certificate generation
- Manual participant list input
- CSV participant upload
- Download all certificates as ZIP
- Save draft certificates
- View generated certificates
- Edit certificate records
- Delete certificate records
- Manage single and bulk certificates

---

### 2. Poster Generator

The Event Poster Generator allows users to create engaging event promotional posters using customizable templates, live preview, optional event banner images, organization logos, and multi-format exports.

#### Features

- 12 event poster templates (Seminar, Conference, FDP, Expert Talk, Workshop, Webinar, Hackathon, Cultural, Sports, Technical, Project Exhibition, Training)
- Dynamic poster builder (`/create-poster`)
- Live poster preview canvas
- Event banner image upload support (Max 5MB)
- Organization logo upload support (Max 5MB)
- Save draft poster
- PNG image download (1080 x 1350 resolution)
- A4 portrait PDF download
- Poster records management page (`/poster-records`)
- View, search, filter, and delete saved poster records

---

### 3. Event Report Generator

The Event Report Generator allows users to create structured academic event reports using event details, objectives, outcomes, photos, and signature details.

#### Features

- Create structured event report
- Mentor-format report preview
- Event details form
- Event outline section
- Objectives section
- Outcomes section
- Photo upload support
- Two-page report preview
- A4 portrait PDF export
- Save draft report
- View event reports
- Edit event reports
- Delete event reports
- Download report PDF
- Professional report management page

---

### 4. Attendance Sheet Generator

The Attendance Sheet Generator manages reusable student records and generates structured multipage attendance sheets with exact mentor formatting, continuous serial numbers, repeated page headers, blank signature columns, and automatic pagination.

#### Features

- Multipage attendance studio workspace (`/attendance-dashboard`)
- Student master-list management (`/student-list`)
- CSV Template Download (`attendance_student_template.csv`) with frontend Blob fallback
- Student CSV Roster Import (`studentCsv`, max 2MB) with duplicate and invalid row reporting table
- Select and delete multiple students
- Delete a complete department/class roster with explicit confirmation
- Filter summary count before deleting a complete roster
- Generated attendance-sheet snapshots remain unchanged when master-list students are deleted
- Dynamic attendance department and class dropdown options
- Create new departments and classes inside a department
- Activate or deactivate attendance options
- Safe deletion protection for options used by students or attendance sheets
- Existing student-option synchronization
- Department-wise class filtering
- Department and class filtering (CE/IT, CSE, AIML, etc.)
- Fixed mentor-format SVG preview & rendering (A4 portrait `viewBox="0 0 210 297"`)
- Direct Vector Multipage A4 PDF Export (`jsPDF` vector rendering using single source of truth metrics)
- Adaptive row height and font scaling (fills page body for partial final pages like 24 rows @ ~8.4mm)
- Automatic multipage pagination (39 rows per full page)
- Continuous serial numbers across all pages
- Blank Sign column
- Event Coordinator placement on the final page only directly below final table
- Repeated header on every page:
  - `School of Engineering, PPSU`
  - `[Department] Department`
  - `[Heading]`
  - `Attendance Sheet`
  - `Class- [Class]`
  - Bordered `Date` row
- Saved attendance sheet records management (`/attendance-records`)
- Direct PDF Download from saved records
- Student List Regeneration / Roster Refresh (`regenerateAttendanceSheet`)
- Duplicate Attendance Sheet as Draft (`duplicateAttendanceSheet`)
- Layout validation utility (`validateAttendanceSheetLayout`) before PDF generation

#### Student Master Bulk APIs

```txt
POST   /api/attendance-students/bulk-delete
GET    /api/attendance-students/filter-summary
DELETE /api/attendance-students/class
```

#### Attendance Department and Class Management

```txt
GET    /api/attendance-options
POST   /api/attendance-options/sync-existing

POST   /api/attendance-options/departments
PUT    /api/attendance-options/departments/:id
DELETE /api/attendance-options/departments/:id

POST   /api/attendance-options/classes
PUT    /api/attendance-options/classes/:id
DELETE /api/attendance-options/classes/:id
```

Create the default CE/IT, CSE, and AIML options only when they are missing:

```bash
cd server
npm run seed:attendance-options
```

With the backend running in development, verify the normalized department,
class, student, and attendance-sheet flow without leaving test records:

```bash
cd server
npm run test:attendance-flow
```

#### Frontend Routes

- `/` - Main Landing Workspace
- `/certificate-dashboard` - Certificate Studio Workspace
- `/create-poster` - Poster Builder Studio
- `/report-dashboard` - Event Report Studio Workspace
- `/attendance-dashboard` - Attendance Studio Workspace
- `/student-list` - Student Master Roster & CSV Import
- `/create-attendance-sheet` - Attendance Sheet Form & Multipage PDF Export
- `/attendance-records` - Attendance Records & PDF Download

---

## Tech Stack

### Frontend

- React.js
- Vite
- Tailwind CSS
- React Router DOM
- SVG Multipage Canvas Renderer
- jsPDF (A4 Vector rendering)
- html2canvas (Certificates/Posters)
- JSZip

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Multer
- dotenv
- CORS

---

## Backend Setup and Deployment

Create `server/.env` from `server/.env.example` and configure:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
CLIENT_URLS=http://localhost:5173,https://your-frontend-domain.vercel.app
NODE_ENV=development
```

`MONGO_URI` is required. Use `CLIENT_URLS` for a comma-separated list of allowed
frontend origins in production; `CLIENT_URL` remains supported for a single
frontend origin.

Run the backend locally:

```bash
cd server
npm install
npm run dev
```

Run the backend in production:

```bash
cd server
npm start
```

The public health endpoint is:

```txt
/api/health
```

For deployment, configure `MONGO_URI`, configure `CLIENT_URLS` with the deployed
frontend origin, and set `NODE_ENV=production`. Uploaded local files may not
persist on hosting services that use temporary or ephemeral filesystems; use
persistent object storage when deployed uploads must survive restarts.

---

## Folder Structure

```txt
event-certificate-generator/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── attendance/
│   │   │   │   ├── AttendanceSheetSvgPreview.jsx
│   │   │   │   ├── AttendanceSheetSvgPage.jsx
│   │   │   │   ├── AttendanceSheetTable.jsx
│   │   │   │   └── AttendanceSheetHeader.jsx
│   │   │   └── navigation/
│   │   │       ├── AttendanceNavigation.jsx
│   │   │       └── MobileModuleNavigation.jsx
│   │   ├── data/
│   │   │   └── brandingData.js
│   │   ├── layouts/
│   │   │   ├── LandingLayout.jsx
│   │   │   ├── CertificateLayout.jsx
│   │   │   ├── ReportLayout.jsx
│   │   │   └── AttendanceLayout.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AttendanceDashboard.jsx
│   │   │   ├── StudentList.jsx
│   │   │   ├── CreateAttendanceSheet.jsx
│   │   │   └── AttendanceRecords.jsx
│   │   ├── services/
│   │   │   ├── attendanceStudentApi.js
│   │   │   └── attendanceSheetApi.js
│   │   ├── utils/
│   │   │   ├── resolveAttendancePageMetrics.js
│   │   │   ├── downloadAttendanceSheetPdf.js
│   │   │   └── validateAttendanceSheetLayout.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
│
├── server/
│   └── ...
├── README.md
├── LICENSE
└── .gitignore
```
