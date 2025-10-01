#!/bin/bash

# Simple deployment script for authentication fixes
# Make sure you have AWS CLI configured with appropriate credentials

set -e

echo "🚀 Starting deployment process..."

# Check if required environment variables are set
if [ -z "$S3_BUCKET_NAME" ] || [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "❌ Error: Please set S3_BUCKET_NAME and CLOUDFRONT_DISTRIBUTION_ID environment variables"
    echo "Example:"
    echo "export S3_BUCKET_NAME=your-frontend-bucket"
    echo "export CLOUDFRONT_DISTRIBUTION_ID=YOUR_DISTRIBUTION_ID"
    exit 1
fi

# Build the application
echo "📦 Building Next.js application..."
npm run build

# Check if build was successful
if [ ! -d "out" ]; then
    echo "❌ Build failed - 'out' directory not found"
    exit 1
fi

# Upload to S3
echo "☁️  Uploading to S3 bucket: $S3_BUCKET_NAME"
aws s3 sync out/ s3://$S3_BUCKET_NAME --delete --cache-control "public, max-age=31536000" --exclude "*.html"
aws s3 sync out/ s3://$S3_BUCKET_NAME --delete --cache-control "no-cache" --include "*.html"

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache: $CLOUDFRONT_DISTRIBUTION_ID"
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"

echo "✅ Deployment complete!"
echo "🌐 Your site should be updated at your custom domain"
echo "⏰ CloudFront invalidation may take 5-15 minutes to complete"