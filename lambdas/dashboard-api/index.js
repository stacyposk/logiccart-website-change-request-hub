'use strict';

const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const REGION = process.env.AWS_REGION;
const DDB_TICKETS = process.env.DDB_TICKETS;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const ddb = new DynamoDBClient({ region: REGION });

// Security constants for public API
const MAX_SCAN_ITEMS = 1000; // Prevent excessive resource usage
const MAX_RECENT_ITEMS = 15; // Limit recent items to prevent data exposure

// No caching - always return fresh data for immediate updates
exports.handler = async (event) => {
    try {
        console.log('Dashboard Lambda invoked:', JSON.stringify(event, null, 2));

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

        // Security: Validate HTTP method
        if (event.httpMethod && event.httpMethod !== 'GET') {
            return resp(405, { error: 'method_not_allowed', message: 'Only GET method is allowed' });
        }

        // No caching - always return fresh data for immediate updates
        // Security: Validate DynamoDB table configuration
        console.log('DynamoDB table name:', DDB_TICKETS);
        if (!DDB_TICKETS || DDB_TICKETS === 'REPLACE_ME_LATER') {
            console.error('DynamoDB table not configured');
            return resp(503, { error: 'service_unavailable', message: 'Service temporarily unavailable' });
        }

        // Get current month for trend calculations
        const currentTime = new Date();
        const currentMonth = currentTime.toISOString().substring(0, 7); // YYYY-MM
        const lastMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() - 1, 1).toISOString().substring(0, 7);

        // Security: Scan with limits and filter by authenticated user
        const scanParams = {
            TableName: DDB_TICKETS,
            Limit: 1000, // Limit per scan operation
            // Security: Only select necessary attributes to minimize data exposure
            ProjectionExpression: 'ticketId, createdAt, updatedAt, #status, requesterName, pageArea, changeType, #month, targetLaunchDate, requesterEmail',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#month': 'month'
            },
            // Filter by authenticated user's email for data isolation
            FilterExpression: 'requesterEmail = :userEmail',
            ExpressionAttributeValues: {
                ':userEmail': { S: userContext.email }
            }
        };

        let allTickets = [];
        let lastEvaluatedKey = null;
        let scanCount = 0;
        const maxScans = Math.ceil(MAX_SCAN_ITEMS / 1000);

        // Handle pagination with security limits
        do {
            if (lastEvaluatedKey) {
                scanParams.ExclusiveStartKey = lastEvaluatedKey;
            }

            const result = await ddb.send(new ScanCommand(scanParams));

            if (result.Items) {
                const convertedItems = result.Items.map(convertDynamoDBItem);
                allTickets = allTickets.concat(convertedItems);
            }

            lastEvaluatedKey = result.LastEvaluatedKey;
            scanCount++;

            // Security: Prevent excessive scanning
            if (scanCount >= maxScans) {
                console.warn(`Reached maximum scan limit of ${maxScans} operations`);
                break;
            }
        } while (lastEvaluatedKey && allTickets.length < MAX_SCAN_ITEMS);

        // Security: Sanitize data before processing
        const sanitizedTickets = allTickets.map(sanitizeTicketData);

        console.log('Dashboard data filtered for user:', {
            userEmail: userContext.email,
            userId: userContext.userId,
            totalTickets: sanitizedTickets.length,
            timestamp: new Date().toISOString()
        });

        // Calculate statistics for user's tickets only
        const totals = calculateTotals(sanitizedTickets);
        const trends = calculateTrends(sanitizedTickets, currentMonth, lastMonth);
        const recent = getRecentTickets(sanitizedTickets, MAX_RECENT_ITEMS);
        const news = getNewsItems();

        const response = {
            totals,
            trends,
            recent,
            news,
            lastUpdated: currentTime.toISOString(),
            // Security: Add metadata for monitoring
            metadata: {
                totalScanned: allTickets.length,
                scanOperations: scanCount,
                cached: false,
                userEmail: userContext.email // Add user context for audit
            }
        };

        return resp(200, response);

    } catch (err) {
        // Security: Log error details for monitoring but don't expose to client
        console.error('Dashboard error with user context:', {
            message: err.message,
            stack: err.stack,
            userContext: event?.requestContext?.authorizer?.jwt?.claims?.email || 'unknown',
            timestamp: new Date().toISOString()
        });

        // Return generic error to prevent information disclosure
        return resp(500, {
            error: 'internal_error',
            message: 'Service temporarily unavailable',
            timestamp: new Date().toISOString()
        });
    }
};

// Calculate total counts by status
// Maps Bedrock Agent statuses: needs_info and rejected both count as "pending"
function calculateTotals(tickets) {
    const totals = {
        total: tickets.length,
        approved: 0,
        pending: 0,
        completed: 0
    };

    tickets.forEach(ticket => {
        const status = ticket.status ? ticket.status.toLowerCase() : '';

        if (status === 'approved') {
            totals.approved++;
        } else if (status === 'pending' || status === 'needs_info' || status === 'rejected') {
            // User-friendly: Both needs_info and rejected show as "pending"
            totals.pending++;
        } else if (status === 'completed') {
            totals.completed++;
        }
        // Unknown statuses are not counted in any category but still count toward total
    });

    return totals;
}

// Calculate month-over-month trends
function calculateTrends(tickets, currentMonth, lastMonth) {
    // Filter tickets by month
    const currentMonthTickets = tickets.filter(t => t.month === currentMonth);
    const lastMonthTickets = tickets.filter(t => t.month === lastMonth);

    // Calculate current month totals
    const currentTotals = calculateTotals(currentMonthTickets);
    const lastTotals = calculateTotals(lastMonthTickets);

    // Calculate percentage changes
    const totalTrend = calculatePercentageChange(lastTotals.total, currentTotals.total);
    const approvedTrend = calculatePercentageChange(lastTotals.approved, currentTotals.approved);
    const completedTrend = calculatePercentageChange(lastTotals.completed, currentTotals.completed);

    return {
        totalTrend,
        approvedTrend,
        completedTrend
    };
}

// Calculate percentage change between two values
function calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) {
        return newValue > 0 ? '+100%' : '0%';
    }

    const change = ((newValue - oldValue) / oldValue) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${Math.round(change)}%`;
}

// Security: Sanitize ticket data to prevent data exposure
function sanitizeTicketData(ticket) {
    return {
        ticketId: sanitizeString(ticket.ticketId),
        createdAt: sanitizeString(ticket.createdAt),
        updatedAt: sanitizeString(ticket.updatedAt),
        status: sanitizeString(ticket.status),
        requesterName: sanitizeString(ticket.requesterName),
        pageArea: sanitizeString(ticket.pageArea),
        changeType: sanitizeString(ticket.changeType),
        month: sanitizeString(ticket.month),
        targetLaunchDate: sanitizeString(ticket.targetLaunchDate)
    };
}

// Security: Sanitize string inputs to prevent XSS and injection
function sanitizeString(input) {
    if (typeof input !== 'string') return input;

    // Remove potentially dangerous characters and limit length
    return input
        .replace(/[<>\"'&]/g, '') // Remove HTML/XML characters
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .substring(0, 200) // Limit length
        .trim();
}

// Get most recent tickets with security filtering
function getRecentTickets(tickets, limit = 5) {
    // Security: Validate and limit the number of recent tickets
    const safeLimit = Math.min(Math.max(parseInt(limit) || 5, 1), MAX_RECENT_ITEMS);

    return tickets
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, safeLimit)
        .map(ticket => ({
            ticketId: ticket.ticketId,
            // No need to mask requester name since user only sees their own tickets
            requesterName: ticket.requesterName,
            pageArea: ticket.pageArea,
            changeType: ticket.changeType,
            status: ticket.status,
            createdAt: ticket.createdAt,
            targetLaunchDate: ticket.targetLaunchDate
        }));
}

// Security: Mask requester names for privacy in public dashboard
function maskRequesterName(name) {
    if (!name || typeof name !== 'string') return 'Anonymous';

    const parts = name.trim().split(' ');
    if (parts.length === 1) {
        // Single name: show first 2 characters + ***
        return parts[0].length > 2 ? parts[0].substring(0, 2) + '***' : parts[0];
    } else {
        // Multiple names: show first name + last initial
        const firstName = parts[0];
        const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
        return `${firstName} ${lastInitial}.`;
    }
}

// Get static news items (could be enhanced to read from DynamoDB or S3)
function getNewsItems() {
    return [
        {
            id: 'news-1',
            date: '2025-09-15',
            headline: 'System Maintenance Scheduled',
            details: 'Scheduled maintenance window on September 20th from 2:00 AM to 4:00 AM EST. All services will remain operational with minimal impact expected.',
            type: 'maintenance',
            priority: 'medium'
        },
        {
            id: 'news-2',
            date: '2025-09-12',
            headline: 'New Feature: Bulk Request Processing',
            details: 'You can now submit multiple page changes in a single request. This feature is currently in beta and available for Marketing team members.',
            type: 'announcement',
            priority: 'high'
        },
        {
            id: 'news-3',
            date: '2025-09-10',
            headline: 'Performance Improvements Deployed',
            details: 'Recent optimizations have reduced average request processing time by 40%. Dashboard loading is now significantly faster.',
            type: 'deployment',
            priority: 'low'
        }
    ];
}

// Convert DynamoDB item format to regular JavaScript object with security validation
function convertDynamoDBItem(item) {
    const converted = {};

    // Security: Validate item exists and is an object
    if (!item || typeof item !== 'object') {
        return {};
    }

    for (const [key, value] of Object.entries(item)) {
        // Security: Validate key is safe
        if (typeof key !== 'string' || key.length > 100) continue;

        try {
            if (value && typeof value === 'object') {
                if (value.S && typeof value.S === 'string') {
                    converted[key] = value.S;
                } else if (value.SS && Array.isArray(value.SS)) {
                    // Security: Limit array size and validate strings
                    converted[key] = value.SS.slice(0, 50).filter(s => typeof s === 'string' && s.length <= 500);
                } else if (value.N && typeof value.N === 'string') {
                    const num = parseFloat(value.N);
                    converted[key] = isNaN(num) ? 0 : num;
                } else if (value.BOOL !== undefined) {
                    converted[key] = Boolean(value.BOOL);
                } else if (value.NULL) {
                    converted[key] = null;
                }
            }
        } catch (err) {
            console.warn(`Error converting DynamoDB attribute ${key}:`, err.message);
            // Skip problematic attributes
        }
    }

    // Security: Don't parse assets JSON in dashboard (not needed and potential security risk)
    // Assets parsing removed for security
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
    // Security: Validate status code
    const safeStatusCode = typeof statusCode === 'number' && statusCode >= 100 && statusCode < 600 ? statusCode : 500;

    // Security: Enhanced CORS headers for production - FIXED CACHING ISSUE
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400', // 24 hours
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        // FIXED: No caching headers for immediate data updates
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    // Add WWW-Authenticate header for 401 responses to guide client
    if (safeStatusCode === 401) {
        headers['WWW-Authenticate'] = 'Bearer realm="API"';
    }

    let responseBody;
    try {
        responseBody = JSON.stringify(body);
    } catch (err) {
        console.error('Error serializing response body:', err);
        responseBody = JSON.stringify({
            error: 'serialization_error',
            message: 'Unable to process response'
        });
    }

    return {
        statusCode: safeStatusCode,
        headers,
        body: responseBody
    };
}