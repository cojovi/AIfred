# AIfred - Setup Instructions

This document provides step-by-step instructions for setting up and configuring the AIfred system.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+**: Download from [nodejs.org](https://nodejs.org/)
- **pnpm 8+**: Install with `npm install -g pnpm`
- **Docker & Docker Compose**: Download from [docker.com](https://docker.com/)
- **Git**: For cloning the repository

## 🗄️ Database Setup

### Option 1: Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com/) and create a new project
2. In the project dashboard, go to **Settings** → **Database**
3. Copy the **Connection string** (URI format)
4. The connection string should look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Option 2: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database named `aifred`
3. The connection string will be:
   ```
   postgresql://username:password@localhost:5432/aifred
   ```

## 🔑 API Keys Setup

### OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Create an account or sign in
3. Go to **API Keys** section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### Service API Keys

#### CompanyCam
1. Contact CompanyCam support for API access
2. Obtain your API key
3. Add to environment configuration

#### AccuLynx
1. Log into your AccuLynx account
2. Go to **Settings** → **API Access**
3. Generate an API key
4. Add to environment configuration

#### ECi Bolt
1. Contact ECi for API access
2. Obtain your API credentials
3. Add to environment configuration

#### Slack
1. Go to [api.slack.com](https://api.slack.com/)
2. Create a new app
3. Go to **OAuth & Permissions**
4. Add the following scopes:
   - `chat:write`
   - `channels:read`
   - `channels:manage`
   - `conversations:read`
   - `conversations:write`
5. Install the app to your workspace
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

## ⚙️ Environment Configuration

### 1. Copy Example Files

```bash
cp apps/api/env.example apps/api/.env
cp apps/web/env.example apps/web/.env
```

### 2. Configure API Environment (`apps/api/.env`)

```bash
# Database - Replace with your actual database URL
DATABASE_URL="postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres"

# OpenAI - Replace with your actual API key
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Authentication - Change this for production
AUTH_DEV_TOKEN="your-secure-dev-token"

# Shell Command Execution
ALLOW_SHELL=1
COMMAND_MODE=SANDBOX

# Service API Keys - Add your actual keys
COMPANYCAM_API_KEY="your-companycam-api-key"
ACCULYNX_API_KEY="your-acculynx-api-key"
BOLT_API_KEY="your-bolt-api-key"
SLACK_BOT_TOKEN="xoxb-your-slack-bot-token"

# Optional: ngrok URL for public access
NGROK_URL="https://your-ngrok-url.ngrok.io"

# Logging
LOG_LEVEL="info"
NODE_ENV="development"

# Server
PORT=8080
HOST="0.0.0.0"
```

### 3. Configure Web Environment (`apps/web/.env`)

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL="http://localhost:8080"

# Authentication (for development)
NEXT_PUBLIC_AUTH_TOKEN="your-secure-dev-token"

# Environment
NODE_ENV="development"
```

## 🚀 Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Database Migration

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
cd ../..
```

### 3. Generate API Types

```bash
pnpm openapi:generate
```

### 4. Start the Application

```bash
# Option 1: Docker Compose (Recommended)
docker compose up --build

# Option 2: Local Development
pnpm dev
```

## 🔧 Service Configuration

### Enable/Disable Services

Edit the configuration files in `apps/api/src/action-packs/<service>/config.json`:

```json
{
  "service": "companycam",
  "enabled": true,  // Set to false to disable
  "synonyms": ["company cam", "companycam", "ccam"],
  "operations": {
    // Configure which API endpoints to expose
  }
}
```

### Add New Services

1. Create a new directory: `apps/api/src/action-packs/<service-name>/`
2. Add the following files:
   - `config.json` - Service configuration
   - `client.ts` - HTTP client implementation
   - `tools.ts` - Tool functions
   - `workflows.ts` - Workflow definitions
3. Add the OpenAPI spec to `assets/openapi/<service-name>.yaml`
4. Run `pnpm openapi:generate` to generate types
5. Update the shared types in `packages/shared/index.ts`

## 🌐 Public Access with ngrok

### 1. Install ngrok

```bash
# Download from https://ngrok.com/download
# Or install via package manager
npm install -g ngrok
```

### 2. Start the Application

```bash
docker compose up --build
```

### 3. Expose with ngrok

```bash
# In another terminal
ngrok http 3000
```

### 4. Update Environment

Copy the ngrok URL and update your environment:

```bash
# In apps/api/.env
NGROK_URL="https://your-ngrok-url.ngrok.io"

# In apps/web/.env (if needed)
NEXT_PUBLIC_API_BASE_URL="https://your-ngrok-url.ngrok.io"
```

## 🧪 Testing the Setup

### 1. Health Check

Visit: http://localhost:8080/health

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. Web Interface

Visit: http://localhost:3000

You should see the Multibot Orchestrator chat interface.

### 3. Test a Simple Request

Try sending a message like:
```
"Hello, can you help me with CompanyCam?"
```

The system should respond with a clarification request.

### 4. Test Service Integration

Try a more specific request:
```
"in companycam, search for projects with name 'test'"
```

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Error
- Verify your `DATABASE_URL` is correct
- Ensure the database is accessible
- Check if the database exists

#### OpenAI API Error
- Verify your `OPENAI_API_KEY` is correct
- Check your OpenAI account has sufficient credits
- Ensure the API key has the necessary permissions

#### Service API Errors
- Verify your service API keys are correct
- Check if the service APIs are accessible
- Review the service configuration files

#### Docker Issues
- Ensure Docker is running
- Check if ports 3000 and 8080 are available
- Try rebuilding the containers: `docker compose down && docker compose up --build`

### Logs

Check the logs for detailed error information:

```bash
# Docker logs
docker compose logs api
docker compose logs web

# Local development logs
# Check the terminal where you ran `pnpm dev`
```

### Database Issues

If you need to reset the database:

```bash
cd apps/api
pnpm prisma migrate reset
pnpm prisma migrate dev
```

## 📚 Next Steps

1. **Configure Services**: Add your actual API keys and test integrations
2. **Customize Workflows**: Modify the workflow definitions for your use cases
3. **Add OpenAPI Specs**: Replace the sample OpenAPI files with your actual API documentation
4. **Deploy**: Follow the deployment instructions in [DETAIL.md](./DETAIL.md)
5. **Monitor**: Set up monitoring and alerting for production use

## 🆘 Getting Help

- **Documentation**: Check [DETAIL.md](./DETAIL.md) for advanced configuration
- **Issues**: Create an issue on GitHub with detailed error information
- **Logs**: Always include relevant logs when reporting issues
- **Environment**: Never share your actual API keys or sensitive configuration
