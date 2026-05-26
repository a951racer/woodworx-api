# WoodworX API

Backend REST API for the WoodworX woodworking management application. Built with Express.js, TypeScript, and MongoDB.

## Local Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm
- MongoDB (local instance or MongoDB Atlas)

### Installation

```bash
cd woodworx-api
npm install
```

### Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/woodworx` |
| `JWT_SECRET` | Secret key for signing JWTs | (generate a random string) |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `NODE_ENV` | Environment mode | `development` |
| `EMAIL_SERVICE` | Email provider | `sendgrid` |
| `SENDGRID_API_KEY` | SendGrid API key | (your key) |
| `EMAIL_FROM` | Sender email address | `noreply@woodworx.app` |
| `STORAGE_SERVICE` | Cloud storage provider | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | (your cloud name) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | (your key) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | (your secret) |

### Running Locally

```bash
# Development mode (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Run tests
npm test
```

## Health Check

The API exposes a health check endpoint:

```
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Use this endpoint to verify the service is running and responsive.

## Deploying to Heroku

### Initial Setup

1. Create a Heroku app:

```bash
heroku create woodworx-api
```

2. Set the Node.js buildpack (usually auto-detected):

```bash
heroku buildpacks:set heroku/nodejs
```

### Configure Environment Variables

Set the following config vars in the Heroku dashboard (Settings > Config Vars) or via CLI:

```bash
# Required
heroku config:set MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/woodworx?retryWrites=true&w=majority"
heroku config:set JWT_SECRET="<your-secure-random-string>"
heroku config:set CORS_ORIGIN="https://your-frontend-app.herokuapp.com"
heroku config:set NODE_ENV="production"

# Optional (with defaults)
heroku config:set JWT_EXPIRES_IN="7d"

# Email service
heroku config:set EMAIL_SERVICE="sendgrid"
heroku config:set SENDGRID_API_KEY="<your-sendgrid-api-key>"
heroku config:set EMAIL_FROM="noreply@woodworx.app"

# Cloud storage
heroku config:set STORAGE_SERVICE="cloudinary"
heroku config:set CLOUDINARY_CLOUD_NAME="<your-cloud-name>"
heroku config:set CLOUDINARY_API_KEY="<your-api-key>"
heroku config:set CLOUDINARY_API_SECRET="<your-api-secret>"
```

**Required variables for production:**

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing authentication tokens |
| `CORS_ORIGIN` | Frontend app URL (for CORS policy) |
| `NODE_ENV` | Set to `production` |

### MongoDB Atlas Setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write access
3. Whitelist Heroku IPs (or allow access from anywhere: `0.0.0.0/0`)
4. Get the connection string and set it as `MONGODB_URI`

### Deploy

```bash
# Push to Heroku
git push heroku main

# Verify deployment
heroku open
curl https://your-app.herokuapp.com/api/health
```

### Procfile

The `Procfile` tells Heroku how to run the application:

```
web: node dist/server.js
```

Heroku automatically runs `npm run build` during deployment (via the `build` script in `package.json`), which compiles TypeScript to JavaScript in the `dist/` directory.

### Monitoring

```bash
# View logs
heroku logs --tail

# Check health
curl https://your-app.herokuapp.com/api/health
```

## API Overview

All endpoints except auth routes require a valid JWT in the `Authorization: Bearer <token>` header.

| Resource | Base Path | Auth Required |
|----------|-----------|---------------|
| Auth | `/api/auth` | No |
| Health | `/api/health` | No |
| Designs | `/api/designs` | Yes |
| Projects | `/api/projects` | Yes |
| Gallery | `/api/gallery` | Yes |
| Customers | `/api/customers` | Yes |
| Settings | `/api/settings` | Yes |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run dev` | Development mode with hot reload |
| `npm test` | Run test suite with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint source files |
