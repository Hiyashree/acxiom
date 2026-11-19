# AcxiomCRM

A role-based customer relationship management (CRM) web app.

- **Frontend:** React 18, React Router, Tailwind CSS, Chart.js, Vite
- **Backend:** Node.js, Express, express-session, bcrypt
- **Database:** MongoDB with Mongoose

## Getting started
Requires Node.js 18 or newer and an internet connection for the first install.

```bash
npm install
npm run build
npm start
```

Open **http://localhost:3000** and click **Create an account**.
The **first account becomes the Admin**; later sign-ups become Sales Executives.
The Admin can change roles on the *Users & roles* page.

`npm run build` builds the React app into `client/dist`. Run it again after changing anything in `client/`.

### Development mode (optional)
Run the API and the React dev server with hot reload in two terminals:
```bash
npm start
```
```bash
npm run dev
```
Then open http://localhost:5173 (API calls are forwarded to port 3000).

## Features
| Module | What it does |
|---|---|
| Authentication | Sign up, sign in, sign out, bcrypt password hashing, password policy (8+ characters, letter + number), lockout after 5 failed attempts for 15 minutes, deactivated users cannot sign in |
| Roles | Admin, Manager, Sales Executive, checked on the server for every API call |
| Dashboard | KPI cards (customers, leads, open leads, opportunities, won / lost, pipeline value, pending follow-ups), charts for lead status, pipeline by stage and monthly won sales, upcoming follow-ups |
| Customers | Create, edit, delete, search, filter by status, pagination, auto code (CUS-0001), unique email and phone |
| Leads | Create, edit, delete, search, filter by status, auto code (LD-0001), convert a Qualified lead into a customer |
| Opportunities | Linked to a customer, probability bar, weighted value (amount × probability / 100), filter by stage |
| Follow-ups | Planned / Completed / Missed / Cancelled, overdue marker, filter by status |
| Activities | Calls, meetings, emails and tasks linked to a customer |
| Users & roles | Admin adds users, changes roles, activates / deactivates, resets passwords, unlocks accounts |
| Audit log | Sign-ups, sign-ins, failed sign-ins, lockouts, sign-outs, create / update (old → new values) / delete, role changes, lead conversions. Read-only, Admin only |
| Reports | Conversion rate, weighted pipeline, overdue follow-ups, pipeline by stage, leads by status and source, follow-ups, activities, user activity. Print or save as PDF |

### Role permissions
| | Admin | Manager | Sales Executive |
|---|---|---|---|
| Dashboard and sales pages | Yes | Yes | Yes |
| Add / edit records | Yes | Yes | Yes |
| Delete records | Yes | Yes | No |
| Reports | Yes | Yes | No |
| Users & roles | Yes | No | No |
| Audit log | Yes | No | No |

### Validation
Checked in the browser (form rules) and again on the server (Mongoose):
- Required fields and maximum lengths
- Email format and 10-digit phone number
- Unique customer email and phone (no duplicate customers)
- Lead status from the allowed list; expected value 0 – 10,000,000
- Opportunity amount greater than 0; probability 0 – 100
- Expected close date not in the past for open opportunities
- Follow-up date not earlier than today for planned follow-ups
- The selected customer must exist

### Security
- Passwords hashed with bcrypt and never returned by the API
- Session cookie is `httpOnly` and `sameSite: strict`
- Every `/api` route except sign-in and sign-up requires a signed-in user
- Error messages do not expose database details

## Not included
Records are not assigned to individual sales executives (everyone sees all records),
no date-range filters on the dashboard, no CSV export, no HTTPS setup.

## Project structure
```
server.js            Express app, CRUD routes, dashboard and report data, database connection
auth.js              Sign-in, sign-up, lockout, roles, user management, audit helper
models.js            Mongoose models and validation rules
client/
  index.html
  src/
    main.jsx         App entry
    App.jsx          Routes and role guards
    api.js           Fetch helper
    auth.jsx         Signed-in user context
    components/
      Layout.jsx     Sidebar and top bar
      CrudPage.jsx   Shared list page: search, filter, table, pagination, form, delete
      AuthShell.jsx  Sign-in / sign-up layout
      ui.jsx         Buttons, badges, modal, toasts, cards, formatters
    pages/           Dashboard, Customers, Leads, Opportunities, FollowUps,
                     Activities, Reports, Users, AuditLog, Login, Register
```

## API
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | Public |
| POST | /api/auth/logout · GET /api/auth/me | Signed in |
| GET, POST | /api/{customers, leads, opportunities, followups, activities} | Signed in |
| GET, PUT | /api/{name}/{id} | Signed in |
| DELETE | /api/{name}/{id} | Admin, Manager |
| POST | /api/leads/{id}/convert | Signed in |
| GET | /api/stats | Signed in |
| GET | /api/reports | Admin, Manager |
| GET, POST, PUT, DELETE | /api/users | Admin |
| GET | /api/audit | Admin |

Status codes: 200, 201, 400 (validation), 401 (not signed in), 403 (no permission), 404, 409 (duplicate), 423 (locked), 500.

## Database
On start the server uses the first option that works:
1. The `MONGODB_URI` environment variable (for example MongoDB Atlas)
2. A local MongoDB at `mongodb://127.0.0.1:27017/acxiomcrm`
3. A built-in MongoDB (`mongodb-memory-server`) that stores data in the `./data` folder, so no separate install is needed

## Deploy on Render

This app is deployed as one web service: Express serves both the API and the built React
login page. GitHub Pages cannot run this app because it also requires Node.js and MongoDB.

1. Create a free MongoDB Atlas cluster and copy its connection string.
2. In Render, choose **New > Blueprint** and select this GitHub repository.
3. Render reads `render.yaml`, builds the React app, and starts the Express server.
4. Enter the MongoDB Atlas connection string as `MONGODB_URI` when prompted.
5. Open the Render service URL; unauthenticated visitors are redirected to `/login`.

Optional environment variables: `PORT` (default 3000), `MONGODB_URI`, `SESSION_SECRET`
(without it a random secret is used and everyone is signed out when the server restarts).
