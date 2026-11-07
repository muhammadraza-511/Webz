# Webz-The Small Web

This repository contains the full-stack technical assessment:

- `frontend/` - Next.js, React, TypeScript, and Tailwind CSS
- `backend/` - NestJS and TypeScript
- `docker-compose.yml` - local MongoDB

## Prerequisites

- Node.js 22 or newer
- npm
- Docker Desktop with Docker Compose

MongoDB Compass is optional. It can connect to the Docker database at
`mongodb://localhost:27017` for inspection, but Docker Compose owns the
database runtime so every developer uses the same setup.

## Step one: run the project

Start MongoDB from the repository root:

```bash
docker compose up -d
```

Install dependencies in each application:

```bash
cd backend
npm install --include=optional --legacy-peer-deps

cd ../frontend
npm install
```

Copy the environment examples:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

Run the backend in one terminal:

```bash
cd backend
npm run start:dev
```

Run the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open <http://localhost:3001>. The backend listens on
<http://localhost:3000>.

The frontend provides the browser controls, isolated site rendering, search,
history, and publishing form. The backend exposes the people, sites, and
visits APIs.

## Step two: seed MongoDB

After MongoDB is running and backend dependencies are installed:

```bash
cd backend
npm run seed
```

The seed creates four people, ten fictional sites, and repeatable browsing
visits. Running it again updates the same people and sites and replaces the
seeded visits, so it does not duplicate data.

You can inspect the database in MongoDB Compass with:

```text
mongodb://localhost:27017
```

## API endpoints

- `GET /people`
- `GET /sites/:address`
- `POST /sites`
- `GET /sites/search?q=keyword`
- `POST /visits`
- `GET /visits/history/:personId`

Published HTML is rendered inside a sandboxed iframe. The iframe can send
fictional `.zz` link clicks to the parent browser, but it does not receive
same-origin access to the Next.js application.

## Stop MongoDB

```bash
docker compose down
```

The named volume keeps local data between restarts. To remove the local
database data as well, run `docker compose down -v`.
