#!/bin/bash

BASE_URL="https://nitkkr-app.vercel.app/api"

echo "Testing Health..."
curl -s "$BASE_URL/health" | grep -o '"status":"healthy"' && echo "✅ Health Check Passed" || echo "❌ Health Check Failed"

echo "Testing Digest..."
curl -s "$BASE_URL/notifications/digest" | grep -o 'hash' && echo "✅ Digest Endpoint Active" || echo "❌ Digest Endpoint Failed"

echo "Testing Notifications (Limit 1)..."
curl -s "$BASE_URL/notifications?limit=1" | grep -o 'hasUpdates' && echo "✅ Notifications Fetch Passed" || echo "❌ Notifications Fetch Failed"

echo "Testing Notification Categories..."
curl -s "$BASE_URL/notifications/categories" | grep -o 'success":true' && echo "✅ Categories Endpoint Passed" || echo "❌ Categories Endpoint Failed"

echo "Testing Jobs..."
curl -s "$BASE_URL/jobs" | grep -o 'success":true' && echo "✅ Jobs Endpoint Passed" || echo "❌ Jobs Endpoint Failed"
