interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Authentication is now handled by CloudFront Function
  // This component is a simple passthrough
  return <>{children}</>;
}