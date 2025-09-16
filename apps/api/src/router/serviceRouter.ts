import { RouteResult } from "../types";
import { db } from "../storage/supabase";
import { logger } from "../telemetry/logger";

export async function routeService(userText: string): Promise<RouteResult> {
  try {
    // Get all enabled services with their synonyms
    const services = await db.serviceConfig.findMany({
      where: { enabled: true },
      select: { service: true, synonyms: true }
    });

    const lower = userText.toLowerCase();
    
    // Check for explicit service mentions first
    for (const service of services) {
      const synonyms = JSON.parse(service.synonyms || "[]");
      const allTerms = [service.service, ...synonyms];
      
      for (const term of allTerms) {
        if (lower.includes(term.toLowerCase())) {
          logger.info({
            type: "service_routed",
            service: service.service,
            term: term,
            confidence: 0.99,
            userText: userText
          });
          
          return { 
            service: service.service, 
            confidence: 0.99 
          };
        }
      }
    }

    // If no explicit mention, try fuzzy matching
    for (const service of services) {
      const synonyms = JSON.parse(service.synonyms || "[]");
      const allTerms = [service.service, ...synonyms];
      
      for (const term of allTerms) {
        const similarity = calculateSimilarity(lower, term.toLowerCase());
        if (similarity > 0.7) {
          logger.info({
            type: "service_routed_fuzzy",
            service: service.service,
            term: term,
            confidence: similarity,
            userText: userText
          });
          
          return { 
            service: service.service, 
            confidence: similarity 
          };
        }
      }
    }

    logger.info({
      type: "service_routing_failed",
      userText: userText,
      availableServices: services.map(s => s.service)
    });

    return { service: null, confidence: 0.0 };
  } catch (error) {
    logger.error({
      type: "service_routing_error",
      error: error instanceof Error ? error.message : "Unknown error",
      userText: userText
    });
    
    return { service: null, confidence: 0.0 };
  }
}

// Simple similarity calculation (Levenshtein distance based)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Get available services for disambiguation
export async function getAvailableServices(): Promise<Array<{service: string; synonyms: string[]}>> {
  const services = await db.serviceConfig.findMany({
    where: { enabled: true },
    select: { service: true, synonyms: true }
  });

  return services.map(s => ({
    service: s.service,
    synonyms: JSON.parse(s.synonyms || "[]")
  }));
}
