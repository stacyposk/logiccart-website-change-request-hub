'use strict';

/**
 * create-ticket
 * - Saves the ticket to DynamoDB
 * - Invokes the Bedrock agent Lambda asynchronously to make a decision
 * - Does NOT send any "submitted" emails (one email only from the agent)
 */

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const REGION = process.env.AWS_REGION;
const DDB_TICKETS = process.env.DDB_TICKETS;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const BEDROCK_AGENT_FUNCTION = process.env.BEDROCK_AGENT_FUNCTION;

const ddb = new DynamoDBClient({ region: REGION });
const lambda = new LambdaClient({
  region: REGION,
  requestTimeout: 15000, // short timeout: async invoke returns quickly
  maxAttempts: 1
});

exports.handler = async (event) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const data = safeJson(event?.body);

    // Extract user context from JWT claims
    const userContext = extractUserContext(event);
    if (!userContext) {
      console.error('No JWT user context found in event');
      return resp(401, { error: 'unauthorized', message: 'Valid JWT token required' });
    }

    console.log('Authenticated user context:', {
      email: userContext.email,
      userId: userContext.userId,
      username: userContext.username
    });

    // Basic validation required by your form (requesterEmail no longer required from client)
    const missing = [];
    for (const f of ['pageArea', 'changeType']) {
      if (!data || data[f] == null || String(data[f]).trim() === '') missing.push(f);
    }
    if (missing.length) {
      console.warn('Missing required fields:', missing);
      return resp(400, { error: 'missing_required_fields', fields: missing });
    }

    const now = new Date().toISOString();
    const ticketId =
      `TKT-${now.substring(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // ---------- Build DynamoDB item (native types) ----------
    const item = {
      ticketId: { S: ticketId },
      createdAt: { S: now },
      updatedAt: { S: now },
      month: { S: now.substring(0, 7) },
      status: { S: 'pending' }, // initial dashboard status
      pageArea: { S: data.pageArea },
      changeType: { S: data.changeType },
      requesterEmail: { S: userContext.email }, // Use authenticated user's email from JWT
      requesterUserId: { S: userContext.userId }, // Add user ID for audit trails
    };

    // Optional fields
    if (hasText(data.requesterName)) item.requesterName = { S: data.requesterName.trim() };
    if (hasText(data.department)) item.department = { S: data.department.trim() };
    if (hasText(data.description)) item.description = { S: data.description.trim() };
    if (Array.isArray(data.pageUrls) && data.pageUrls.length) {
      const urls = data.pageUrls.filter(u => hasText(u)).map(u => u.trim());
      if (urls.length) item.pageUrls = { SS: urls };
    }
    if (hasText(data.copyEn)) item.copyEn = { S: data.copyEn };
    if (hasText(data.copyZh)) item.copyZh = { S: data.copyZh };
    if (hasText(data.targetLaunchDate)) item.targetLaunchDate = { S: data.targetLaunchDate };
    if (hasText(data.notes)) item.notes = { S: data.notes };

    // Assets: store as DynamoDB List< Map > (L/M) so Python reader gets native list/dicts
    if (Array.isArray(data.assets) && data.assets.length > 0) {
      item.assets = {
        L: data.assets.map(a => ({
          M: {
            s3Key: { S: String(a.s3Key || '') },
            filename: { S: String(a.filename || '') },
            type: { S: String(a.type || '') },
            // optional numeric fields
            width: a?.width != null ? { N: String(a.width) } : { NULL: true },
            height: a?.height != null ? { N: String(a.height) } : { NULL: true },
            // alt text exists but agent won't re-check it (frontend validated)
            altText: hasText(a?.altText) ? { S: a.altText } : { NULL: true }
          }
        }))
      };
    }

    console.log('DynamoDB item:', JSON.stringify(item, null, 2));
    console.log('User context for ticket creation:', {
      ticketId,
      userEmail: userContext.email,
      userId: userContext.userId,
      timestamp: now
    });

    // ---------- Save ----------
    if (!DDB_TICKETS) {
      console.error('DDB_TICKETS not configured');
      return resp(500, { error: 'server_misconfigured', message: 'DDB_TICKETS not set' });
    }

    await ddb.send(new PutItemCommand({ TableName: DDB_TICKETS, Item: item }));
    console.log('Saved ticket to DynamoDB with user context:', {
      ticketId,
      userEmail: userContext.email,
      userId: userContext.userId
    });

    // ---------- Invoke Bedrock Agent (async fire-and-forget, but awaited send) ----------
    try {
      await invokeBedrockAgent(ticketId, userContext);
    } catch (invokeErr) {
      // We still return 200 to the client to avoid blocking UX;
      // the agent can be re-triggered manually if needed.
      console.error('Bedrock Agent invocation failed (non-blocking):', {
        error: invokeErr?.message,
        stack: invokeErr?.stack,
        userContext: {
          email: userContext.email,
          userId: userContext.userId
        }
      });
    }

    // Client gets immediate confirmation (no email here)
    return resp(200, {
      ticketId,
      submittedAt: now,
      message: 'Ticket created successfully'
    });

  } catch (err) {
    console.error('Unhandled error with user context:', {
      error: err?.message,
      stack: err?.stack,
      userContext: event?.requestContext?.authorizer?.jwt?.claims?.email || 'unknown',
      timestamp: new Date().toISOString()
    });
    return resp(500, { error: 'internal_error', message: err?.message || 'Unexpected error' });
  }
};

// ---------- Helpers ----------

function hasText(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function safeJson(b) {
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { return {}; }
  }
  if (typeof b === 'object') return b;
  return {};
}

function resp(statusCode, body) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };

  // Add WWW-Authenticate header for 401 responses to guide client
  if (statusCode === 401) {
    headers['WWW-Authenticate'] = 'Bearer realm="API"';
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

// Invoke the Bedrock Agent Lambda asynchronously.
// Use full ARN in BEDROCK_AGENT_FUNCTION to avoid cross-stage/name ambiguity.
async function invokeBedrockAgent(ticketId, userContext) {
  if (!BEDROCK_AGENT_FUNCTION) {
    throw new Error('BEDROCK_AGENT_FUNCTION not configured');
  }

  const payload = {
    httpMethod: 'POST',
    pathParameters: { id: ticketId },
    headers: { 'Content-Type': 'application/json' },
    // Pass user context to Bedrock Agent for audit trails
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            email: userContext.email,
            sub: userContext.userId,
            'cognito:username': userContext.username
          }
        }
      }
    }
  };

  const cmd = new InvokeCommand({
    FunctionName: BEDROCK_AGENT_FUNCTION,
    InvocationType: 'Event',               // async
    Payload: JSON.stringify(payload)
  });

  console.log('Invoking Bedrock Agent with user context:', {
    region: REGION,
    functionName: BEDROCK_AGENT_FUNCTION,
    ticketId,
    userEmail: userContext.email,
    userId: userContext.userId
  });

  const response = await lambda.send(cmd); // should be quick; expect StatusCode 202
  console.log('Async invoke response:', response);
  return response;
}

// Extract user context from JWT claims in the event
function extractUserContext(event) {
  try {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
      console.warn('No JWT claims found in event requestContext');
      return null;
    }

    const email = claims.email;
    const userId = claims.sub;
    const username = claims['cognito:username'] || claims.username;

    if (!email || !userId) {
      console.warn('Missing required JWT claims:', { email: !!email, userId: !!userId });
      return null;
    }

    return {
      email,
      userId,
      username: username || email.split('@')[0] // fallback to email prefix if no username
    };
  } catch (err) {
    console.error('Error extracting user context from JWT:', err);
    return null;
  }
}
