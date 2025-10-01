/**
 * CloudFront Function: require-auth-v2
 * Attach to: Default (*) behavior, event = viewer-request
 * DO NOT attach to /auth/* behavior
 */

function qsToString(qs) {
  var keys = Object.keys(qs || {});
  if (!keys.length) return '';
  var pairs = [];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    pairs.push(k + '=' + qs[k].value);
  }
  return '?' + pairs.join('&');
}

function isStatic(uri) {
  return uri.startsWith('/_next/') ||
    /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|gif|map|json|txt|woff2?|eot|ttf)$/i.test(uri);
}

function addIndexIfNeeded(req) {
  var uri = req.uri || '/';
  // For Next.js static export with trailingSlash: true
  if (uri.endsWith('/') && uri !== '/') {
    req.uri = uri + 'index.html';
  } else if (!uri.includes('.') && uri !== '/') {
    req.uri = uri + '/index.html';
  }
}

function handler(event) {
  var req = event.request;
  var uri = req.uri || '/';
  var method = req.method;

  // 0) Always allow auth pages (even if not logged in)
  if (uri === '/auth/start' || uri === '/auth/start/' ||
    uri === '/auth/callback' || uri === '/auth/callback/' ||
    uri.indexOf('/auth/') === 0) {
    // For auth pages, ensure proper routing to static files
    addIndexIfNeeded(req);
    return req;
  }

  // 1) Bypass static assets & CORS preflights
  if (method === 'OPTIONS' || isStatic(uri)) {
    return req;
  }

  // 2) Check for your own session cookie (set it on /auth/callback)
  var cookies = req.cookies || {};
  var hasSession = !!(cookies.lc_session && cookies.lc_session.value === '1');
  if (hasSession) {
    addIndexIfNeeded(req);
    return req;
  }

  // 3) Not authenticated → send to /auth/start/ (with trailing slash for Next.js static export)
  var qs = qsToString(req.querystring);
  var next = encodeURIComponent(uri + qs);
  return {
    statusCode: 302,
    statusDescription: 'Found',
    headers: {
      location: { value: '/auth/start/?next=' + next },
      'cache-control': { value: 'no-store' }
    }
  };
}