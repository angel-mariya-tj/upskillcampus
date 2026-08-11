# Servanta — Multi-Tenant Service Marketplace

> *Connecting Services. Creating Opportunities.*

A full-stack service marketplace platform connecting customers with service providers (merchants). Built as a final-year B.Tech CS internship project.

---

## Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Frontend   | React.js + TypeScript + Vite  |
| Styling    | Tailwind CSS v4               |
| Backend    | Node.js + Express.js          |
| Database   | PostgreSQL                    |
| Auth       | JWT + bcrypt                  |
| HTTP Client| Axios                         |

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd servanta
```

### 2. Backend Setup

```bash
cd backend
```

Configure environment variables:
```bash
# Edit backend/.env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=servanta
DB_PASSWORD=<your_postgres_password>
DB_PORT=5432
JWT_SECRET=your_super_secret_key
PORT=5000
NODE_ENV=development
```

Create the PostgreSQL database:
```sql
CREATE DATABASE servanta;
```

Initialize the schema and seed data:
```bash
npm run db:init   # Creates all tables
npm run db:seed   # Seeds default roles, categories, and demo users
```

Start the backend server:
```bash
npm run dev
```
Backend runs at: **http://localhost:5000**

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: **http://localhost:5173**

---

## Demo Accounts

After running `npm run db:seed`:

| Role     | Email                    | Password      |
|----------|--------------------------|---------------|
| Admin    | admin@servanta.com       | admin123      |
| Merchant | priya@servanta.com       | merchant123   |
| Customer | rahul@servanta.com       | customer123   |

---

## Project Structure

```
servanta/
├── backend/
│   ├── controllers/        # Route handler logic
│   ├── routes/             # Express route definitions
│   ├── services/           # Business logic layer
│   ├── middleware/         # Auth, error handling
│   ├── config/             # Database connection
│   ├── utils/              # JWT helpers
│   ├── database/
│   │   ├── schema/         # SQL init scripts
│   │   └── seed/           # Demo data scripts
│   ├── app.ts              # Express app config
│   └── server.ts           # Server entry point
│
└── frontend/
    └── src/
        ├── components/     # Reusable UI (Navbar, Footer, ProtectedRoute)
        ├── layouts/        # PublicLayout, DashboardLayout
        ├── pages/
        │   ├── public/     # Landing, Login, Register, Services, Merchants
        │   ├── customer/   # Dashboard, Bookings, Payments
        │   ├── merchant/   # Dashboard, Profile, Services, Bookings, Earnings
        │   └── admin/      # Dashboard, Users, Merchants, Categories, Bookings, Payments
        ├── hooks/          # useAuth context
        ├── services/       # Axios API client
        └── utils/          # Helpers
```

---

## API Base URL

`http://localhost:5000/api/v1`

Health check: `GET /api/v1/health`

---

## Development Phases Completed

- ✅ Phase 1: Project setup & architecture
- ✅ Phase 2: Database schema & seed data
- ✅ Phase 3: Authentication & JWT
- ✅ Phase 4: Merchant module
- ✅ Phase 5: Customer module
- ✅ Phase 6: Booking system
- ✅ Phase 7: Payment module
- ✅ Phase 8: Reviews & notifications
- ✅ Phase 9: Admin dashboard
