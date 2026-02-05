import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

/**
 * Sample Netlify Function
 *
 * Access at: /.netlify/functions/hello
 *
 * This is an example of a standalone Netlify Function.
 * Use these for:
 * - Background jobs
 * - Webhooks
 * - Scheduled functions (cron jobs)
 * - Any serverless logic that doesn't need Next.js
 *
 * For API routes that need Next.js features, use src/app/api/ instead.
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    const { httpMethod, body, queryStringParameters } = event;

    // Example: Handle different HTTP methods
    if (httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Hello from Netlify Function!",
          timestamp: new Date().toISOString(),
          query: queryStringParameters,
        }),
      };
    }

    if (httpMethod === "POST") {
      const data = body ? JSON.parse(body) : {};

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Data received",
          data,
        }),
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Function error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
