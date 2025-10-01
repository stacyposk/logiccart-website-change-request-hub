/**
 * CloudFront Function: append-index-for-auth
 * Attach to: /auth/* behavior, event = viewer-request
 * Purpose: Ensures /auth/start/ resolves to /auth/start/index.html
 */

function handler(event) {
  var req = event.request;
  var uri = req.uri || '/';
  
  // Only touch /auth/* paths
  if (uri.indexOf('/auth/') === 0) {
    var hasDot = uri.indexOf('.') !== -1; // looks like a file
    if (!hasDot) {
      if (uri.endsWith('/')) {
        req.uri = uri + 'index.html';
      } else {
        req.uri = uri + '/index.html';
      }
    }
  }
  
  return req;
}