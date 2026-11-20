EventForge is a full-stack event management platform for planning, organizing, publishing, and operating conferences or similar events. It includes separate attendee and organizer experiences, role-based access, session and speaker management, ticketing, announcements, check-in tools, analytics, and an AI-assisted content copilot.

## Live Application

- **Hosted frontend:** https://event-forge-backup-featureadd.vercel.app
- **Repository:** https://github.com/Akhileshvankayala/eventForge_backup_featureadd

## Features

### Attendee Experience

- Discover public events
- Register or sign in
- View sessions and speakers
- Register for events and packages
- Explore event schedules
- Generate personalized session recommendations
- Ask event questions through the AI chatbot
- View event information, venues, sponsors, and announcements

### Organizer Experience

- Create and manage events
- Configure ticket types and packages
- Manage venues
- Add and organize sessions
- Manage speakers and sponsors
- Publish announcements
- Review attendee registrations
- Perform attendee check-in
- View event analytics
- Generate event, session, speaker, email, and social-media content

### AI Copilot

The application includes:

- Event description generation
- Session description generation
- Speaker biography generation
- Email announcement generation
- Social media post generation
- Event agenda creation
- Free-form content drafting
- Session recommendations
- Knowledge-base questions and answers

The API uses a mocked AI implementation for several draft-generation endpoints. The `/api/ai/ask` endpoint can use a RAG system backed by MongoDB and OpenRouter when configured.

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Routing | Wouter |
| Styling | Tailwind CSS 4 |
| UI Components | Radix UI, shadcn-style components |
| Backend | Node.js, Express 4 |
| Database | MongoDB |
| Authentication | JSON Web Tokens, bcrypt |
| Validation | express-validator |
| AI | OpenRouter-compatible API, custom RAG implementation |
| Deployment | Vercel and Render |
| Maps | Google Maps integration |
| 3D Components | Three.js |

Additional libraries include Framer Motion, Recharts, Axios, Zod, React Hook Form, Zustand, Sonner, Lucide React, and i18next.

## Project Structure

```text
eventForge_backup_featureadd/
├── frontend/
│   ├── public/                 Static public assets
│   ├── src/
│   │   ├── components/         Shared UI and feature components
│   │   ├── contexts/           Authentication, language, and theme contexts
│   │   ├── hooks/              Reusable React hooks
│   │   ├── i18n/               Translation and language configuration
│   │   ├── lib/                Frontend utilities
│   │   ├── pages/              Landing, auth, organizer, and attendee pages
│   │   ├── App.tsx             Application routes and providers
│   │   ├── main.tsx            React entry point
│   │   └── index.css           Global Tailwind and theme styles
│   └── index.html
│
├── backend/
│   ├── routes/                 Express API route modules
│   ├── models/                 MongoDB document interfaces and operations
│   ├── middleware/             Authentication, authorization, validation, scoping
│   ├── lib/                    RAG, PDF, and content-generation utilities
│   ├── knowledge/              Generated knowledge-base content
│   ├── db.ts                   MongoDB connection management
│   ├── setup-db.ts             Database initialization and seed data
│   └── index.ts                Express server and application entry point
│
├── shared/
│   └── const.ts                Shared constants
│
├── patches/                    Dependency patches
├── vercel.json                 Vercel frontend configuration
├── render.yaml                 Render backend deployment configuration
├── .env.example                Environment variable template
├── package.json                Scripts and dependencies
├── verify-*.mjs                Feature, security, RAG, and scoping checks
└── vite.config.ts              Vite configuration and development proxy
```

## Architecture

The frontend is a React single-page application built with Vite. Wouter manages client-side routing, while React Context provides authentication, theme, and language state.

The backend is a standalone Express server that exposes REST endpoints under `/api`. MongoDB stores users, events, venues, sessions, speakers, sponsors, tickets, attendees, packages, announcements, and analytics data.

A typical request follows this flow:

1. React sends a request to an API endpoint.
2. Express applies security, CORS, JSON parsing, authentication, validation, and scope middleware.
3. Route handlers read or modify MongoDB collections.
4. MongoDB returns the result.
5. React updates its local state or context and renders the response.

The server can also serve the built Vite frontend in production and provide SPA fallback routing.

## Backend API Overview

| API Area | Purpose |
|---|---|
| `/api/auth` | Registration, login, profile, password changes, logout |
| `/api/users` | User administration |
| `/api/events` | Event CRUD operations |
| `/api/venues` | Venue management |
| `/api/sessions` | Session management |
| `/api/speakers` | Speaker profiles |
| `/api/sponsors` | Sponsor profiles |
| `/api/tickets` | Ticket type management |
| `/api/attendees` | Attendee registration records |
| `/api/packages` | Event packages |
| `/api/announcements` | Event announcements |
| `/api/ai` | Content generation and AI assistance |
| `/api/checkin` | Attendee check-in |
| `/api/public` | Public event content |
| `/api/analytics` | Organizer analytics |

Utility endpoints include:

- `GET /healthz` — health check
- `GET /robots.txt` — crawler configuration
- `GET /sitemap.xml` — sitemap
- `GET /` — application entry page or API status depending on the environment

## Prerequisites

Install the following:

- [Node.js](https://nodejs.org/) 20 or newer
- npm or pnpm
- [MongoDB](https://www.mongodb.com/) running locally or a hosted MongoDB connection

A local MongoDB installation is sufficient for development.

## Installation

Clone the repository:

```bash
git clone https://github.com/Akhileshvankayala/eventForge_backup_featureadd.git
cd eventForge_backup_featureadd
```

Install dependencies:

```bash
npm install
```

Alternatively, if pnpm is available:

```bash
pnpm install
```

## Environment Configuration

Create a local environment file:

```bash
cp .env.example .env
```

Update `.env` with the appropriate values:

```dotenv
OPENROUTER_API_KEY=
OPENROUTER_MODEL=next-agi/next-n2.5-mini:free

MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=eventForge

JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:3000
PUBLIC_BASE_URL=http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|---|---:|---|
| `MONGODB_URI` | Yes | MongoDB connection URI |
| `DB_NAME` | Yes | MongoDB database name |
| `JWT_SECRET` | Yes in production | Secret used to sign authentication tokens |
| `FRONTEND_URL` | Recommended | Allowed frontend origin for CORS |
| `PUBLIC_BASE_URL` | Recommended | Public URL used in sitemap and links |
| `OPENROUTER_API_KEY` | Optional | API key for live RAG and OpenRouter responses |
| `OPENROUTER_MODEL` | Optional | OpenRouter model identifier |
| `PORT` | Optional | Backend port; defaults to `3000` |

For a development server, a temporary JWT secret is not required, but a secure random secret should be used in production.

## Running Locally

Start MongoDB on its default port:

```bash
mongod
```

Start the application:

```bash
npm run dev
```

The Vite development server listens on port `3000`. Open:

```text
http://localhost:3000
```

The Vite configuration proxies `/api` and `/healthz` requests to the Express backend on the same host and port.

## Available npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite and serve the development application |
| `npm run build:client` | Build the frontend into `dist/public` |
| `npm run build:server` | Compile the Express server into `dist/index.js` |
| `npm run build` | Build frontend and backend |
| `npm start` | Run the compiled production server |
| `npm run preview` | Preview the Vite production build |
| `npm run check` | Run TypeScript checks |
| `npm run format` | Format project files with Prettier |

## Production Build

Build both frontend and backend:

```bash
npm run build
```

Run the compiled application:

```bash
npm start
```

The production server:

- Uses MongoDB from the environment
- Requires `JWT_SECRET`
- Serves the built frontend
- Handles SPA fallback requests
- Exposes API endpoints on the configured port

## Database Setup

The database connection code uses the MongoDB Node.js driver and defaults to:

```text
mongodb://127.0.0.1:27017
```

The default database name is `eventForge`.

The repository includes `backend/setup-db.ts` for initializing collections and seed data. Run it only after MongoDB is running and environment variables are configured.

```bash
npx tsx backend/setup-db.ts
```

Because this utility can modify database content, review it before running it against a production database.

## Authentication and Roles

Passwords are hashed with bcrypt.

JSON Web Tokens are generated after login or registration and should be sent to protected endpoints using the bearer authentication header:

```text
Authorization: Bearer <token>
```

Supported application roles include:

- `attendee`
- `organizer`
- `speaker`
- `sponsor`
- `staff`
- `admin`

Public registration is limited to attendee and other non-privileged roles. Admin and staff accounts should be created through protected administrative workflows.

## Frontend Pages

| Route | Page | Access |
|---|---|---|
| `/` | Landing page | Public |
| `/auth` | Login and registration | Public |
| `/attendee` | Attendee dashboard | Authenticated attendee |
| `/organizer` | Organizer dashboard | Organizer, admin, or staff |
| `/organizer/:module` | Specific organizer module | Organizer, admin, or staff |
| `/404` | Not-found page | Public |

## Verification Scripts

The repository includes standalone verification scripts:

```bash
node verify-features.mjs
node verify-security.mjs
node verify-scoping.mjs
node verify-rag.mjs
```

These scripts validate specific project behavior and integrations. Live RAG verification may require an API key and running database.

## Deployment

### Render

`render.yaml` configures a Node.js web service and declares the required environment variables.

Typical Render settings:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check: `/healthz`

Add real values for:

- `JWT_SECRET`
- `MONGODB_URI`
- `OPENROUTER_API_KEY`
- `FRONTEND_URL`
- `PUBLIC_BASE_URL`

### Vercel

`vercel.json` configures Vercel to build the Vite client and route application requests to `dist/public/index.html`.

Use the following build settings when deploying manually:

- Framework: Vite
- Build command: `npm run build:client`
- Output directory: `dist/public`

Configure `VITE_API_URL` or the deployment API endpoint only if the frontend uses an independently hosted backend.

## Development Notes

- Keep real secrets out of Git. `.env` is excluded through `.gitignore`.
- The backend requires MongoDB before it starts successfully.
- `JWT_SECRET` must be set in production.
- CORS origins should be separated by commas in `FRONTEND_URL`.
- The knowledge PDF is refreshed after successful data mutations in development and production.
- Some AI draft endpoints are intentionally mock implementations and return generated text without calling an external model.
- The live `/api/ai/ask` endpoint can connect to OpenRouter and use MongoDB-backed RAG.

## Troubleshooting

### MongoDB connection failure

Verify that MongoDB is running:

```bash
mongod
```

If using MongoDB Atlas or another hosted provider, set `MONGODB_URI` to the complete connection string.

### Port already in use

Change the backend port:

```bash
PORT=4000 npm start
```

For Vite development, also update the proxy target and frontend origin if necessary.

### Authentication fails

Confirm that:

- `JWT_SECRET` is defined
- The same secret is used across server instances
- The bearer token is included in requests
- The password has at least six characters

### Frontend cannot reach the API

Check that:

- The backend is running
- `/api` requests are reaching the Express server
- `FRONTEND_URL` contains the correct frontend origin
- CORS is not blocking the deployed domain

### AI responses are unavailable

Set `OPENROUTER_API_KEY` and ensure `OPENROUTER_MODEL` is valid. Mock AI endpoints will continue to work without an API key.

## License

The root `package.json` declares the MIT license.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make focused code changes.
4. Run TypeScript checks:

   ```bash
   npm run check
   ```

5. Build the project:

   ```bash
   npm run build
   ```

6. Open a pull request describing the change and how to test it.
