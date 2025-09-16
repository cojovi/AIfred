# Multibot Orchestrator - Technical Details

This document provides comprehensive technical details for developers and system administrators working with the Multibot Orchestrator.

## 🏗️ Architecture Deep Dive

### Core Components

#### 1. Router Module (`apps/api/src/router/`)
- **Purpose**: Intelligently routes user requests to appropriate services
- **Algorithm**: Fuzzy string matching with confidence scoring
- **Fallback**: Disambiguation prompts when confidence is low
- **Configuration**: Service synonyms and routing rules

#### 2. Planner Module (`apps/api/src/planner/`)
- **Purpose**: Converts natural language to structured task specifications
- **AI Model**: OpenAI GPT-4 with function calling
- **Output**: TaskSpec objects with service, intent, and inputs
- **Validation**: Zod schema validation for all outputs

#### 3. Executor Module (`apps/api/src/executor/`)
- **Purpose**: Executes workflows with full audit logging
- **Features**: Step-by-step execution, disambiguation handling, error recovery
- **Tools**: HTTP clients, command runner, tool registry
- **Logging**: Comprehensive audit trail for all operations

### Data Flow

```
User Input → Router → Planner → Executor → Service APIs → Response
     ↓           ↓        ↓         ↓           ↓
   Logging   Logging  Logging   Logging    Logging
```

## 🗄️ Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

#### Conversations
```sql
CREATE TABLE "Conversation" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

#### Messages
```sql
CREATE TABLE "Message" (
  "id" TEXT PRIMARY KEY,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "conversationId" TEXT REFERENCES "Conversation"("id"),
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

#### Tasks
```sql
CREATE TABLE "Task" (
  "id" TEXT PRIMARY KEY,
  "service" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "inputs" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "result" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "conversationId" TEXT REFERENCES "Conversation"("id")
);
```

#### Steps
```sql
CREATE TABLE "Step" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT REFERENCES "Task"("id"),
  "index" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "args" JSONB NOT NULL,
  "output" JSONB,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

#### API Calls
```sql
CREATE TABLE "ApiCall" (
  "id" TEXT PRIMARY KEY,
  "service" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "request" JSONB NOT NULL,
  "response" JSONB,
  "status" INTEGER,
  "latencyMs" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "taskId" TEXT REFERENCES "Task"("id"),
  "stepId" TEXT REFERENCES "Step"("id")
);
```

#### Command Runs
```sql
CREATE TABLE "CommandRun" (
  "id" TEXT PRIMARY KEY,
  "command" TEXT NOT NULL,
  "args" TEXT,
  "cwd" TEXT,
  "mode" TEXT NOT NULL,
  "exitCode" INTEGER,
  "stdout" TEXT,
  "stderr" TEXT,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "taskId" TEXT REFERENCES "Task"("id"),
  "stepId" TEXT REFERENCES "Step"("id")
);
```

## 🔧 Configuration Management

### Environment Variables

#### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for GPT-4 access
- `AUTH_DEV_TOKEN`: Bearer token for API authentication

#### Optional Variables
- `ALLOW_SHELL`: Enable shell command execution (default: 0)
- `COMMAND_MODE`: Command execution mode (SANDBOX|HOST)
- `NGROK_URL`: Public URL for webhook callbacks
- `LOG_LEVEL`: Logging verbosity (debug|info|warn|error)

#### Service-Specific Variables
- `COMPANYCAM_API_KEY`: CompanyCam API authentication
- `ACCULYNX_API_KEY`: AccuLynx API authentication
- `BOLT_API_KEY`: ECi Bolt API authentication
- `SLACK_BOT_TOKEN`: Slack bot token

### Service Configuration

Each service has a `config.json` file with:

```json
{
  "service": "service-name",
  "enabled": true,
  "synonyms": ["alias1", "alias2"],
  "operations": {
    "operation_name": {
      "summary": "Human-readable description",
      "method": "HTTP_METHOD",
      "path": "/api/endpoint",
      "query": ["param1", "param2"],
      "body": ["field1", "field2"]
    }
  }
}
```

## 🛠️ Development Workflow

### Adding a New Service

1. **Create Service Directory**
   ```bash
   mkdir -p apps/api/src/action-packs/new-service/generated
   ```

2. **Add Configuration**
   ```typescript
   // apps/api/src/action-packs/new-service/config.json
   {
     "service": "new-service",
     "enabled": true,
     "synonyms": ["newservice", "ns"],
     "operations": {
       "list_items": {
         "summary": "List all items",
         "method": "GET",
         "path": "/api/items"
       }
     }
   }
   ```

3. **Implement HTTP Client**
   ```typescript
   // apps/api/src/action-packs/new-service/client.ts
   export class NewServiceClient extends HttpClient {
     constructor() {
       super({
         baseUrl: "https://api.newservice.com",
         apiKey: process.env.NEW_SERVICE_API_KEY
       });
     }
     
     async listItems(params: any): Promise<ToolResult> {
       // Implementation
     }
   }
   ```

4. **Create Tools**
   ```typescript
   // apps/api/src/action-packs/new-service/tools.ts
   export const newServiceTools = {
     "new-service.list_items": newServiceListItems
   };
   ```

5. **Define Workflows**
   ```typescript
   // apps/api/src/action-packs/new-service/workflows.ts
   export const workflows: Workflow = {
     list_items: [
       {
         action: "new-service.list_items",
         bind: {
           limit: "inputs.extra.limit"
         }
       }
     ]
   };
   ```

6. **Add OpenAPI Spec**
   ```yaml
   # assets/openapi/new-service.yaml
   openapi: 3.0.0
   info:
     title: New Service API
     version: 1.0.0
   paths:
     /api/items:
       get:
         summary: List items
         # ... rest of spec
   ```

7. **Generate Types**
   ```bash
   pnpm openapi:generate
   ```

8. **Update Shared Types**
   ```typescript
   // packages/shared/index.ts
   export const TaskSpec = z.object({
     service: z.enum(["companycam", "acculynx", "bolt", "slack", "new-service"]),
     // ... rest of schema
   });
   ```

### Testing

#### Unit Tests
```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @multibot/api test

# Run tests in watch mode
pnpm test:watch
```

#### Integration Tests
```bash
# Test API endpoints
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"message": "test message"}'
```

#### End-to-End Tests
```bash
# Test complete workflow
# 1. Start the application
docker compose up --build

# 2. Test web interface
# Visit http://localhost:3000 and interact with the chat

# 3. Test API directly
# Use the health check endpoint and chat API
```

## 🚀 Deployment Strategies

### Local Development
```bash
# Start with hot reload
pnpm dev

# Or with Docker
docker compose up --build
```

### Production with Docker
```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Deploy with production config
docker compose -f docker-compose.prod.yml up -d
```

### Google Cloud VM Deployment

1. **Create VM Instance**
   ```bash
   gcloud compute instances create multibot-vm \
     --image-family=ubuntu-2004-lts \
     --image-project=ubuntu-os-cloud \
     --machine-type=e2-standard-2 \
     --zone=us-central1-a
   ```

2. **Install Dependencies**
   ```bash
   # SSH into the VM
   gcloud compute ssh multibot-vm

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd multibot-orchestrator

   # Copy environment files
   cp apps/api/env.example apps/api/.env
   cp apps/web/env.example apps/web/.env

   # Edit environment files with production values
   nano apps/api/.env
   nano apps/web/.env

   # Start application
   docker compose up -d --build
   ```

4. **Configure Reverse Proxy (Optional)**
   ```nginx
   # /etc/nginx/sites-available/multibot
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api/ {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Kubernetes Deployment

1. **Create Namespace**
   ```yaml
   # k8s/namespace.yaml
   apiVersion: v1
   kind: Namespace
   metadata:
     name: multibot
   ```

2. **Deploy API Service**
   ```yaml
   # k8s/api-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: multibot-api
     namespace: multibot
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: multibot-api
     template:
       metadata:
         labels:
           app: multibot-api
       spec:
         containers:
         - name: api
           image: multibot-api:latest
           ports:
           - containerPort: 8080
           env:
           - name: DATABASE_URL
             valueFrom:
               secretKeyRef:
                 name: multibot-secrets
                 key: database-url
   ```

3. **Deploy Web Service**
   ```yaml
   # k8s/web-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: multibot-web
     namespace: multibot
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: multibot-web
     template:
       metadata:
         labels:
           app: multibot-web
       spec:
         containers:
         - name: web
           image: multibot-web:latest
           ports:
           - containerPort: 3000
   ```

## 🔒 Security Considerations

### Authentication
- **Development**: Simple bearer token authentication
- **Production**: Implement proper OAuth2/JWT authentication
- **Rate Limiting**: Built-in rate limiting with Fastify
- **CORS**: Configurable CORS policies

### Command Execution
- **Sandbox Mode**: Commands run in Docker containers by default
- **Host Mode**: Explicit opt-in required with `COMMAND_MODE=HOST`
- **Timeout**: All commands have configurable timeouts
- **Logging**: All command execution is logged and auditable

### Data Protection
- **Encryption**: All API keys stored in environment variables
- **Logging**: Sensitive data is redacted from logs
- **Database**: Use SSL connections for database access
- **Secrets**: Use Kubernetes secrets or Docker secrets in production

### Network Security
- **HTTPS**: Use TLS in production
- **Firewall**: Restrict access to necessary ports only
- **VPN**: Consider VPN access for sensitive deployments

## 📊 Monitoring and Observability

### Logging
- **Structured Logs**: JSON format with Pino
- **Log Levels**: Debug, Info, Warn, Error
- **Redaction**: Automatic redaction of sensitive data
- **Rotation**: Configure log rotation for production

### Metrics
- **Health Checks**: Built-in health endpoints
- **Performance**: Request latency and throughput
- **Errors**: Error rates and types
- **Usage**: API usage patterns and service utilization

### Alerting
- **Health**: Service health monitoring
- **Errors**: Error rate thresholds
- **Performance**: Latency and throughput alerts
- **Security**: Authentication and authorization failures

### Dashboards
- **Grafana**: Create dashboards for key metrics
- **Prometheus**: Collect and store metrics
- **ELK Stack**: Log aggregation and analysis

## 🔧 Maintenance

### Database Maintenance
```bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql

# Run migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate
```

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose up --build -d

# Or for local development
pnpm install
pnpm build
pnpm start
```

### Log Management
```bash
# View logs
docker compose logs -f api
docker compose logs -f web

# Clean up old logs
docker system prune -f
```

## 🆘 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Verify environment variables
echo $DATABASE_URL

# Check network connectivity
telnet your-db-host 5432
```

#### API Key Issues
```bash
# Test OpenAI API
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Test service APIs
curl -H "Authorization: Bearer $COMPANYCAM_API_KEY" \
  https://api.companycam.com/v1/projects
```

#### Docker Issues
```bash
# Check Docker status
docker ps
docker compose ps

# View container logs
docker logs multibot-api
docker logs multibot-web

# Restart services
docker compose restart
```

### Performance Optimization

#### Database Optimization
- Add indexes for frequently queried columns
- Use connection pooling
- Monitor query performance
- Regular VACUUM and ANALYZE

#### Application Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies
- Monitor memory usage

#### Infrastructure Optimization
- Use load balancers for high availability
- Implement auto-scaling
- Use managed database services
- Monitor resource utilization

## 📚 Additional Resources

- **OpenAPI Specification**: [openapis.org](https://openapis.org/)
- **Prisma Documentation**: [prisma.io/docs](https://prisma.io/docs)
- **Fastify Documentation**: [fastify.dev](https://fastify.dev)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Docker Documentation**: [docs.docker.com](https://docs.docker.com)
- **OpenAI API Documentation**: [platform.openai.com/docs](https://platform.openai.com/docs)
