import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Use env var for bucket
const REGION = process.env.AWS_REGION;
const BUCKET = process.env.BUCKET_UPLOADS;

const s3 = new S3Client({ region: REGION });

export const handler = async (event) => {
    try {
        console.log('=== Lambda Upload URL Debug ===');
        console.log('Received event:', JSON.stringify(event, null, 2));
        console.log('Environment variables:');
        console.log('- BUCKET_UPLOADS:', BUCKET);
        console.log('- AWS_REGION:', REGION);

        // Handle OPTIONS preflight request
        if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
            console.log('Handling CORS preflight request');
            return response(200, { message: 'CORS preflight' });
        }

        // Extract user context from JWT claims
        const userContext = extractUserContext(event);
        if (!userContext) {
            console.error('No JWT user context found in event');
            return response(401, { error: 'unauthorized', message: 'Valid JWT token required' });
        }

        console.log('Authenticated user context:', {
            email: userContext.email,
            userId: userContext.userId
        });
        const body = JSON.parse(event.body || "{}");
        console.log('Parsed body:', JSON.stringify(body, null, 2));

        // Updated to camelCase field names
        const { filename, contentType, sizeKb } = body;

        if (!filename || !contentType) {
            return response(400, { error: "Missing filename or contentType" });
        }

        // SECURITY VALIDATIONS
        // Filename validation
        if (filename.length > 255) {
            return response(400, { error: 'filename_too_long', max_length: 255 });
        }

        // Validate file extension (security)
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExtension)) {
            return response(400, {
                error: 'invalid_file_type',
                allowed_types: allowedExtensions,
                received: fileExtension
            });
        }

        // Validate content type (security)
        const allowedContentTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'image/webp', 'image/svg+xml'
        ];
        if (!allowedContentTypes.includes(contentType)) {
            return response(400, {
                error: 'invalid_content_type',
                allowed_types: allowedContentTypes,
                received: contentType
            });
        }

        // File size validation (1MB limit - aligned with frontend 500KB limit)
        const maxSizeKb = 1024; // 1MB in KB
        if (sizeKb && sizeKb > maxSizeKb) {
            return response(400, {
                error: 'file_too_large',
                max_size_mb: 1,
                received_size_kb: sizeKb,
                max_size_kb: maxSizeKb
            });
        }

        // Generate unique S3 key with user context for authenticated uploads
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        // Use user-specific prefix for authenticated uploads
        const userPrefix = userContext.userId.substring(0, 8); // Use first 8 chars of user ID
        const s3Key = `uploads/users/${userPrefix}/${timestamp}-${randomId}-${sanitizedFilename}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: s3Key,
            ContentType: contentType,
            // Remove ContentLength from command - it causes presigned URL issues
            ...(sizeKb && {
                Metadata: { 'original-size-kb': sizeKb.toString() }
            })
        });

        const uploadUrl = await getSignedUrl(s3, command, {
            expiresIn: 300, // 5 min
            // Only sign content-type, not content-length
            signableHeaders: new Set(['content-type'])
        });

        console.log('✅ Generated presigned URL for authenticated user:', {
            s3Key,
            userEmail: userContext.email,
            userId: userContext.userId,
            bucket: BUCKET,
            timestamp: new Date().toISOString()
        });
        console.log('Upload URL (first 100 chars):', uploadUrl.substring(0, 100) + '...');

        // Updated response to camelCase
        return response(200, {
            uploadUrl: uploadUrl,
            s3Key: s3Key,
            bucket: BUCKET,
            expiresIn: 300,
            maxSizeKb: maxSizeKb,
            message: 'Presigned URL generated successfully'
        });
    } catch (err) {
        console.error("Error generating upload URL with user context:", {
            error: err?.message,
            stack: err?.stack,
            userContext: event?.requestContext?.authorizer?.jwt?.claims?.email || 'unknown',
            timestamp: new Date().toISOString()
        });
        return response(500, {
            error: "Internal Server Error",
            message: "Failed to generate upload URL",
            details: err.message
        });
    }
};

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

function response(statusCode, body) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
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