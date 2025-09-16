import fs from "fs";
import path from "path";
import { parse } from "yaml";
import { generateTypes } from "openapi-typescript";

const ASSETS_DIR = path.join(process.cwd(), "assets", "openapi");
const GENERATED_DIR = path.join(process.cwd(), "apps", "api", "src", "action-packs");

interface ServiceConfig {
  service: string;
  openapiRef: string;
  enabled: boolean;
  synonyms: string[];
  operations: Record<string, any>;
}

async function generateTypesForService(serviceName: string): Promise<void> {
  const openapiFile = path.join(ASSETS_DIR, `${serviceName}.yaml`);
  const generatedDir = path.join(GENERATED_DIR, serviceName, "generated");
  
  if (!fs.existsSync(openapiFile)) {
    console.log(`⚠️  OpenAPI file not found for ${serviceName}: ${openapiFile}`);
    return;
  }

  try {
    // Ensure generated directory exists
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }

    // Read and parse OpenAPI spec
    const openapiContent = fs.readFileSync(openapiFile, "utf8");
    const openapiSpec = parse(openapiContent);

    // Generate TypeScript types
    const types = await generateTypes(openapiSpec, {
      transform: (schemaObject, meta) => {
        // Add JSDoc comments for better IntelliSense
        if (meta.path) {
          return `/** ${meta.path} */\n${schemaObject}`;
        }
        return schemaObject;
      }
    });

    // Write types to file
    const typesFile = path.join(generatedDir, "types.d.ts");
    fs.writeFileSync(typesFile, types);

    console.log(`✅ Generated types for ${serviceName}: ${typesFile}`);

  } catch (error) {
    console.error(`❌ Failed to generate types for ${serviceName}:`, error);
  }
}

async function updateServiceConfigs(): Promise<void> {
  const services = ["companycam", "acculynx", "bolt", "slack"];
  
  for (const service of services) {
    const configFile = path.join(GENERATED_DIR, service, "config.json");
    
    if (fs.existsSync(configFile)) {
      try {
        const config: ServiceConfig = JSON.parse(fs.readFileSync(configFile, "utf8"));
        
        // Update the openapiRef path to be relative to the config file
        config.openapiRef = `../../../assets/openapi/${service}.yaml`;
        
        // Write updated config
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        
        console.log(`✅ Updated config for ${service}`);
        
      } catch (error) {
        console.error(`❌ Failed to update config for ${service}:`, error);
      }
    }
  }
}

async function createSampleOpenAPIFiles(): Promise<void> {
  const services = [
    {
      name: "companycam",
      spec: {
        openapi: "3.0.0",
        info: {
          title: "CompanyCam API",
          version: "1.0.0",
          description: "API for managing construction projects and photos"
        },
        servers: [
          {
            url: "https://api.companycam.com",
            description: "Production server"
          }
        ],
        paths: {
          "/v1/projects": {
            get: {
              summary: "List projects",
              parameters: [
                {
                  name: "name",
                  in: "query",
                  schema: { type: "string" }
                },
                {
                  name: "address",
                  in: "query",
                  schema: { type: "string" }
                }
              ],
              responses: {
                "200": {
                  description: "List of projects",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          projects: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                                address: { type: "string" },
                                description: { type: "string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            post: {
              summary: "Create project",
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        address: { type: "string" },
                        description: { type: "string" }
                      },
                      required: ["name", "address"]
                    }
                  }
                }
              },
              responses: {
                "201": {
                  description: "Project created",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          address: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "/v1/projects/{project_id}": {
            get: {
              summary: "Get project",
              parameters: [
                {
                  name: "project_id",
                  in: "path",
                  required: true,
                  schema: { type: "string" }
                }
              ],
              responses: {
                "200": {
                  description: "Project details",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          address: { type: "string" },
                          description: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "/v1/projects/{project_id}/conversations": {
            post: {
              summary: "Create project conversation",
              parameters: [
                {
                  name: "project_id",
                  in: "path",
                  required: true,
                  schema: { type: "string" }
                }
              ],
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      },
                      required: ["message"]
                    }
                  }
                }
              },
              responses: {
                "201": {
                  description: "Conversation created",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          message: { type: "string" },
                          project_id: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ];

  // Create sample OpenAPI files if they don't exist
  for (const service of services) {
    const openapiFile = path.join(ASSETS_DIR, `${service.name}.yaml`);
    
    if (!fs.existsSync(openapiFile)) {
      try {
        const yamlContent = `# ${service.spec.info.title} - OpenAPI Specification
# This is a sample OpenAPI spec. Replace with your actual API documentation.

openapi: ${service.spec.openapi}
info:
  title: ${service.spec.info.title}
  version: ${service.spec.info.version}
  description: ${service.spec.info.description}

servers:
${service.spec.servers.map((server: any) => `  - url: ${server.url}`).join('\n')}

paths:
${Object.entries(service.spec.paths).map(([path, methods]: [string, any]) => 
  `  ${path}:\n${Object.entries(methods).map(([method, spec]: [string, any]) => 
    `    ${method}:\n      summary: ${spec.summary}`
  ).join('\n')}`
).join('\n')}

# Add your actual API paths, parameters, and responses here
# This is just a placeholder structure
`;

        fs.writeFileSync(openapiFile, yamlContent);
        console.log(`📝 Created sample OpenAPI file for ${service.name}: ${openapiFile}`);
        
      } catch (error) {
        console.error(`❌ Failed to create sample OpenAPI file for ${service.name}:`, error);
      }
    }
  }
}

async function main(): Promise<void> {
  console.log("🚀 Starting OpenAPI ingestion...");
  
  // Ensure assets directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  // Create sample OpenAPI files
  await createSampleOpenAPIFiles();

  // Generate types for each service
  const services = ["companycam", "acculynx", "bolt", "slack"];
  
  for (const service of services) {
    await generateTypesForService(service);
  }

  // Update service configs
  await updateServiceConfigs();

  console.log("✅ OpenAPI ingestion complete!");
  console.log("\n📋 Next steps:");
  console.log("1. Replace the sample OpenAPI files in assets/openapi/ with your actual API specs");
  console.log("2. Update the service configurations in apps/api/src/action-packs/*/config.json");
  console.log("3. Run this script again to regenerate types");
}

if (require.main === module) {
  main().catch(console.error);
}
