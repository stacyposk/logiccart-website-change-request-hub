'use strict';

const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const REGION = process.env.AWS_REGION;
const DDB_TICKETS = process.env.DDB_TICKETS;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

const ddb = new DynamoDBClient({ region: REGION });

exports.handler = async (event) => {
  try {
    // Extract user context from JWT claims
    const userContext = extractUserContext(event);
    if (!userContext) {
      console.error('No JWT user context found in event');
      return resp(401, { error: 'unauthorized', message: 'Valid JWT token required' });
    }

    console.log('Authenticated user context:', {
      email: userContext.email,
      userId: userContext.userId
    });

    // Parse and validate query parameters
    const queryParams = event.queryStringParameters || {};

    // Validate status parameter
    const validStatuses = ['pending', 'approved', 'completed', 'rejected'];
    const status = validStatuses.includes(queryParams.status) ? queryParams.status : null;

    // Use authenticated user's email instead of query parameter for security
    const email = userContext.email;

    // Validate date parameters (basic ISO date format)
    const fromDate = queryParams.from && /^\d{4}-\d{2}-\d{2}/.test(queryParams.from) ? queryParams.from : null;
    const toDate = queryParams.to && /^\d{4}-\d{2}-\d{2}/.test(queryParams.to) ? queryParams.to : null;

    // Limit parameter validation (cap at 100 for security)
    const limit = Math.min(Math.max(parseInt(queryParams.limit) || 50, 1), 100);

    const lastKey = queryParams.lastKey;

    // Build scan parameters (Free Tier optimized - using Scan instead of GSIs)
    const scanParams = {
      TableName: DDB_TICKETS,
      Limit: Math.min(limit, 100), // Cap at 100 for Free Tier
    };

    // Add pagination if lastKey provided
    if (lastKey) {
      try {
        scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
      } catch (err) {
        console.warn('Invalid lastKey provided:', err);
      }
    }

    // Build filter expression for query parameters
    const filterExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (status) {
      filterExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = { S: status };
    }

    // Always filter by authenticated user's email for data isolation
    filterExpressions.push('requesterEmail = :email');
    expressionAttributeValues[':email'] = { S: email };

    if (fromDate) {
      filterExpressions.push('createdAt >= :fromDate');
      expressionAttributeValues[':fromDate'] = { S: fromDate };
    }

    if (toDate) {
      filterExpressions.push('createdAt <= :toDate');
      expressionAttributeValues[':toDate'] = { S: toDate };
    }

    // Apply filters if any
    if (filterExpressions.length > 0) {
      scanParams.FilterExpression = filterExpressions.join(' AND ');
      if (Object.keys(expressionAttributeNames).length > 0) {
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
      }
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    // Execute scan
    const result = await ddb.send(new ScanCommand(scanParams));

    // Convert DynamoDB items to regular JavaScript objects
    const items = result.Items ? result.Items.map(convertDynamoDBItem) : [];

    // Sort by createdAt descending (most recent first)
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log('Tickets filtered for user:', {
      userEmail: userContext.email,
      userId: userContext.userId,
      totalTickets: items.length,
      statusFilter: status,
      timestamp: new Date().toISOString()
    });

    // Prepare response
    const response = {
      items: items,
      count: items.length,
      // Add user context for audit
      metadata: {
        userEmail: userContext.email,
        filteredBy: status || 'all'
      }
    };

    // Add pagination info if there are more items
    if (result.LastEvaluatedKey) {
      response.lastKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
    }

    return resp(200, response);

  } catch (err) {
    console.error('Error fetching tickets with user context:', {
      error: err?.message,
      stack: err?.stack,
      userContext: event?.requestContext?.authorizer?.jwt?.claims?.email || 'unknown',
      timestamp: new Date().toISOString()
    });
    return resp(500, { error: 'internal_error', message: 'Failed to fetch tickets' });
  }
};

// Convert DynamoDB item format to regular JavaScript object
function convertDynamoDBItem(item) {
  const converted = {};

  for (const [key, value] of Object.entries(item)) {
    if (value.S) {
      converted[key] = value.S;
    } else if (value.SS) {
      converted[key] = value.SS;
    } else if (value.N) {
      converted[key] = parseFloat(value.N);
    } else if (value.BOOL) {
      converted[key] = value.BOOL;
    } else if (value.NULL) {
      converted[key] = null;
    }
    // Add more type conversions as needed
  }

  // Parse assets JSON if present
  if (converted.assets) {
    try {
      converted.assets = JSON.parse(converted.assets);
    } catch (err) {
      console.warn('Failed to parse assets JSON:', err);
    }
  }

  // Parse pageUrls array if present
  if (converted.pageUrls && Array.isArray(converted.pageUrls)) {
    // pageUrls is already an array from SS type
  }

  return converted;
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

function resp(statusCode, body) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
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