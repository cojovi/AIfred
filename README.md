# AIfred

A sophisticated AI-powered multibot orchestrator with Router → Planner → Executor architecture, capable of managing multiple construction management services (CompanyCam, AccuLynx, ECi Bolt, Slack) with full audit logging, disambiguation prompts, and shell command execution capabilities.

## 🚀 Features

- **Multi-Service Integration**: Seamlessly work with CompanyCam, AccuLynx, ECi Bolt, and Slack
- **AI-Powered Planning**: Uses OpenAI GPT-4 for intelligent task planning and disambiguation
- **Full Audit Trail**: Complete logging of all API calls, commands, and user interactions
- **Shell Command Execution**: Safe execution of shell commands with sandboxing options
- **Modern Web Interface**: Clean, responsive Next.js chat interface
- **Docker Ready**: Full containerization with docker-compose for easy deployment
- **Type-Safe**: Built with TypeScript and Zod for robust type safety

## 🏗️ Architecture

The system follows a three-module architecture:

1. **Router**: Intelligently routes user requests to the appropriate service
2. **Planner**: Uses AI to create structured task specifications and handle disambiguation
3. **Executor**: Executes workflows with full audit logging and error handling

## 📋 Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL database (Supabase recommended)
- OpenAI API key
- Service API keys (CompanyCam, AccuLynx, Bolt, Slack)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/AIfred.git
cd AIfred
pnpm install
```

### 2. Environment Setup

Copy the example environment files and configure them:

```bash
cp apps/api/env.example apps/api/.env
cp apps/web/env.example apps/web/.env
```

Edit the `.env` files with your actual values (see [INSTRUCTIONS.md](./INSTRUCTIONS.md) for detailed configuration).

### 3. Database Setup

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
```

### 4. Generate API Types

```bash
pnpm openapi:generate
```

### 5. Start Development

```bash
# Option 1: Docker Compose (Recommended)
docker compose up --build

# Option 2: Local Development
pnpm dev
```

### 6. Access the Application

- **Web Interface**: http://localhost:3000
- **API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health

## 🎯 Usage Examples

### CompanyCam Integration

```
User: "in companycam i want you to add a project conversation to Ashley Garrison, 2502 Briarbrook Dr Houston, TX 77042. saying 'Glad we wrapped this up'"

System: 
1. Routes to CompanyCam service
2. Plans the task (search project → create conversation)
3. Shows plan preview for confirmation
4. Executes the workflow with disambiguation if needed
5. Returns success with conversation ID
```

### Slack Integration

```
User: "send a message to #general channel saying 'Project update: All systems operational'"

System:
1. Routes to Slack service
2. Plans the message sending task
3. Executes the message delivery
4. Confirms successful delivery
```

## 🛠️ Development

### Project Structure

```
AIfred/
├── apps/
│   ├── api/                 # Fastify API service
│   │   ├── src/
│   │   │   ├── router/      # Service routing logic
│   │   │   ├── planner/     # AI task planning
│   │   │   ├── executor/    # Task execution engine
│   │   │   ├── action-packs/ # Service integrations
│   │   │   └── ...
│   │   └── prisma/          # Database schema
│   └── web/                 # Next.js web interface
│       └── app/             # App Router pages
├── packages/
│   └── shared/              # Shared types and utilities
├── assets/
│   └── openapi/             # OpenAPI specifications
└── scripts/                 # Build and utility scripts
```

### Available Scripts

```bash
# Development
pnpm dev                    # Start both API and web in development
pnpm build                  # Build all applications
pnpm start                  # Start production builds

# Database
pnpm db:migrate             # Run database migrations
pnpm db:generate            # Generate Prisma client
pnpm db:studio              # Open Prisma Studio

# Docker
pnpm docker:build          # Build Docker images
pnpm docker:up             # Start with Docker Compose
pnpm docker:down           # Stop Docker Compose

# Utilities
pnpm openapi:generate      # Generate TypeScript types from OpenAPI specs
```

## 🔧 Configuration

### Service Configuration

Each service is configured in `apps/api/src/action-packs/<service>/config.json`:

```json
{
  "service": "companycam",
  "enabled": true,
  "synonyms": ["company cam", "companycam", "ccam"],
  "operations": {
    "search_project": {
      "summary": "Find a project by name/address",
      "method": "GET",
      "path": "/v1/projects"
    }
  }
}
```

### Environment Variables

See [INSTRUCTIONS.md](./INSTRUCTIONS.md) for complete environment configuration details.

## 🚀 Deployment

### Local with ngrok

```bash
# Start the application
docker compose up --build

# In another terminal, expose the web interface
ngrok http 3000
```

### Google Cloud VM

1. Create an e2-standard-2 VM
2. Install Docker and Docker Compose
3. Copy the repository and environment files
4. Run `docker compose up -d --build`
5. Configure reverse proxy (optional)

See [DETAIL.md](./DETAIL.md) for detailed deployment instructions.

## 🔒 Security

- **Authentication**: Bearer token authentication (dev mode)
- **Command Execution**: Sandboxed by default, with explicit HOST mode option
- **API Keys**: Stored in environment variables, never in code
- **Audit Logging**: All actions are logged with sensitive data redaction
- **Input Validation**: Zod schemas validate all inputs

## 📊 Monitoring

- **Health Checks**: Built-in health endpoints
- **Structured Logging**: JSON logs with Pino
- **Database Logging**: All API calls and commands stored in PostgreSQL
- **Error Tracking**: Comprehensive error logging and handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: See [INSTRUCTIONS.md](./INSTRUCTIONS.md) and [DETAIL.md](./DETAIL.md)
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

## 🎉 Acknowledgments

- Built with Fastify, Next.js, Prisma, and OpenAI
- Inspired by modern AI agent architectures
- Designed for construction industry workflows
- Named AIfred as a tribute to the AI assistant concept
