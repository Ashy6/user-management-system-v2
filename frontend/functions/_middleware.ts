// Cloudflare Pages Functions middleware
export async function onRequest(context: any) {
  // Add CORS headers for API requests
  const response = await context.next();
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}