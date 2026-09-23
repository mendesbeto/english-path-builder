import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  allow?: AppRole[];
}

export function ProtectedRoute({ children, allow }: Props) {
  const { user, role, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (allow && (!role || !allow.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  // Teacher accounts must be explicitly approved by an administrator
  // before accessing protected teacher/admin surfaces.
  if (role === "teacher" && profile && !profile.is_approved && allow?.includes("teacher")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
