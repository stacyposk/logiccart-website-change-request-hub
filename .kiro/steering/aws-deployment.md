# AWS Production Deployment Guide

This document provides guidance for deploying and maintaining the LogicCart Website Change Request Hub on AWS using Free Tier services.

## Deployment Architecture

### **Frontend (S3 + CloudFront)**
- **S3 Private Bucket**: Secure hosting with CloudFront Origin Access Control (OAC)
- **CloudFront CDN**: Global distribution with custom subdomain and ACM SSL certificate
- **Custom Domain**: Subdomain with AWS Certificate Manager (ACM) public SSL certificate
- **Origin Access Control**: CloudFront OAC for secure S3 access (replaces legacy OAI)
- **Cache Strategy**: HTML (no-cache), static assets (1 year max-age)
- **SPA Routing**: Custom error pages (404/403 → /index.html, HTTP 200)

### **CloudFront OAC Configuration**
- **Origin Access Control**: Modern replacement for Origin Access Identity (OAI)
- **S3 Bucket Policy**: Restricts access to CloudFront distribution only
- **Security Benefits**: Enhanced security with AWS Signature Version 4 (SigV4)
- **Regional Optimization**: Better performance for S3 origins in all AWS regions

### **Custom Domain & SSL Setup**
- **ACM Certificate**: Public SSL certificate for custom subdomain
- **DNS Configuration**: CNAME record pointing to CloudFront distribution
- **Professional Appearance**: Custom domain instead of CloudFront default URL
- **Automatic Renewal**: ACM handles SSL certificate renewal automatically

### **Backend (Serverless)**
- **HTTP API Gateway**: Single instance with CORS, cost-effective routing
- **Lambda Functions**: 4 specialized functions for different operations
- **DynamoDB**: On-demand billing with table scans for Free Tier optimization
- **S3 Storage**: Separate buckets for uploads and data with lifecycle policies

### **AI & Notifications**
- **Bedrock Runtime API**: Amazon Nova Lite for cost-effective automated ticket analysis and decision-making
- **SNS**: Email notifications for ticket status updates and NEEDS_INFO guidance
- **CloudWatch**: Monitoring and Free Tier usage tracking

### **Security Layer (Production Ready)**
- **Cognito User Pool**: Enterprise authentication with Hosted UI deployed and operational
- **CloudFront Functions**: Route protection with session cookie validation
- **PKCE Flow**: Secure authorization code exchange without client secrets
- **Session Management**: Secure token storage with deep linking support
- **Production Authentication**: Complete system operational with enterprise-grade security

## Technical Standards

### **JSON Data Format**
- **Consistent camelCase**: ticketId, createdAt, requesterName, pageArea, etc.
- **Timestamps**: ISO-8601 UTC format (2025-09-15T10:00:00Z)
- **Month Field**: YYYY-MM format for efficient trend aggregation
- **API Responses**: Standardized error handling with proper HTTP status codes

### **File Upload Security**
- **Presigned URLs**: 5-minute expiration with content-length-range enforcement
- **Content-Type Matching**: Client must use same Content-Type as signing
- **CORS Configuration**: Specific origins (localhost, CloudFront domain)
- **Metadata**: Dimensions measured by frontend and sent in payload

### **Database Query Optimization (Free Tier)**
- **Table Scans**: Use FilterExpression for status and email filtering
- **Pagination**: Use lastKey for efficient large dataset handling
- **Free Tier Optimization**: Simple scans avoid GSI costs

## CloudFront OAC & Custom Domain Setup

### **S3 Bucket Configuration**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-private-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::account-id:distribution/distribution-id"
        }
      }
    }
  ]
}
```

### **CloudFront Distribution Settings**
- **Origin**: S3 bucket (not website endpoint)
- **Origin Access Control**: Create and assign OAC to origin
- **Alternate Domain Names**: Your custom subdomain
- **SSL Certificate**: Select ACM certificate for your domain
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS

### **ACM Certificate Requirements**
- **Domain Validation**: DNS or email validation required
- **Region**: Must be in us-east-1 (N. Virginia) for CloudFront
- **Wildcard Support**: Optional for subdomain flexibility

## Free Tier Cost Management

### **Cost Optimization**
- **S3 Lifecycle**: Transition to IA after 30 days, delete after 180 days
- **Lambda Memory**: 128MB minimum for cost optimization
- **HTTP API Gateway**: Less expensive than REST API for cost optimization
- **DynamoDB**: On-demand billing for variable workloads
- **CloudWatch**: Alarms at 80% of Free Tier limits
- **ACM Certificates**: Free for AWS services (CloudFront, ALB, etc.)
- Total monthly cost: Within AWS FREE Tier for MVP Usage


## Security Best Practices

### **IAM Least Privilege**
```typescript
// Lambda permissions (minimal)
const lambdaPermissions = {
  dynamodb: ['PutItem', 'Query', 'UpdateItem'], // Specific tables only
  s3: ['GetObject'], // No PutObject (browser uploads directly)
  cloudwatch: ['CreateLogGroup', 'CreateLogStream', 'PutLogEvents'],
  sns: ['Publish'], // Only for notification Lambda
  bedrock: ['InvokeModel'] // Only for analysis Lambda using Runtime API
}
```

### **Network Security**
- **HTTPS Enforcement**: CloudFront redirects HTTP to HTTPS with ACM SSL certificate
- **Origin Access Control**: CloudFront OAC ensures S3 bucket is only accessible via CloudFront
- **Private S3 Bucket**: No public access, all traffic routed through CloudFront distribution
- **Custom Domain Security**: Subdomain with validated ACM certificate for professional appearance
- **CORS Configuration**: S3 uploads bucket and API Gateway (not CloudFront)
- **API Throttling**: Default burst/rate limits on API Gateway
- **Presigned URL Security**: Short expiration, content-length-range enforcement

## Cognito Security Implementation 

### **Production Implementation**
- **Cognito User Pool**: Deployed with Managed Login and PKCE configuration
- **CloudFront Functions**: Route protection operational in production
- **Frontend Integration**: PKCE flow with secure token management
- **Session Management**: Deep linking and state preservation working

### **Completed Implementation**
1. **Cognito User Pool Setup**
   - Email as username with PKCE App Client configuration
   - Hosted UI domain operational with callback/logout URLs
   - Demo users created and tested

2. **CloudFront Functions Protection**
   - Route protection with session cookie validation
   - Static asset allowlisting and SPA routing support
   - Deployed to production CloudFront distribution

3. **Frontend PKCE Integration**
   - `/auth/start` page with invisible PKCE flow initiation
   - `/auth/callback` page with secure token exchange
   - Deep linking preservation through authentication flow

4. **Production Testing & Validation**
   - End-to-end authentication flow operational
   - Error handling and retry mechanisms working
   - Complete system deployed and accessible

### **Security Benefits Achieved**
- **Enterprise-Grade**: PKCE authentication without client secrets
- **AWS-Managed**: Managed login with professional appearance
- **Production Ready**: Complete authentication system operational
- **Audit-Ready**: CloudWatch logs and comprehensive monitoring

## Deployment Phases

### **Phase 1: Static Site Deployment**
1. Verify Next.js static export configuration
2. Deploy to private S3 bucket (no public access)
3. Configure CloudFront with Origin Access Control (OAC)
4. Set up custom subdomain with ACM SSL certificate
5. Configure CloudFront with compression and error handling
6. Test SPA routing and asset loading through custom domain

### **Phase 2: Frontend-Backend Integration**
1. Configure environment variables for API endpoints
2. Update API client to use deployed AWS services
3. Implement presigned URL image upload flow
4. Test complete form submission and success page flow

### **Phase 3: Advanced Features**
1. Deploy SNS for email notifications
2. Deploy Bedrock Runtime API decision engine for intelligent ticket processing
3. Add missing Lambda functions for dashboard data
4. Test complete AI decision-making workflow

### **Phase 4: Security Layer**
1. Cognito User Pool with Managed Login deployed
2. CloudFront Functions for route protection operational
3. Frontend PKCE token management implemented
4. Complete authenticated system tested and validated

## Monitoring and Maintenance

### **CloudWatch Metrics**
- Lambda function duration and error rates
- DynamoDB read/write capacity utilization
- S3 upload success/failure rates
- API Gateway request counts and latencies
- Free Tier usage tracking

### **Operational Tasks**
- Monthly Free Tier usage review
- S3 lifecycle policy effectiveness
- Lambda performance optimization
- DynamoDB query efficiency monitoring
- Cost optimization recommendations

## Development Workflow

### **Local Development**
```bash
# Environment setup
cp .env.example .env.local
# Configure NEXT_PUBLIC_API_BASE with your API Gateway URL

# Development
npm run dev          # Local development with API Gateway integration
npm run build        # Test static export
npm run test         # Run test suite
```

### **Deployment Commands**
```bash
# Frontend deployment
npm run build        # Generate static export
aws s3 sync out/ s3://your-private-frontend-bucket --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"

# Note: S3 bucket is private and only accessible via CloudFront OAC
# Custom subdomain with ACM SSL certificate provides professional URL

# Backend updates (if needed)
# Lambda functions deployed manually via AWS Console
```

This guide ensures consistent deployment practices and maintains the cost-effective, secure architecture within AWS Free Tier limits.