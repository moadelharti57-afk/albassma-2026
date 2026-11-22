import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface RequireStaffProps {
  children: ReactNode;
  adminOnly?: boolean;
}

/**
 * Keeps admin pages away from visitors without a staff/admin role.
 * This only hides the UI: the real protection is the database's row-level
 * security, which refuses the data to anyone without the role.
 */
export const RequireStaff = ({ children, adminOnly = false }: RequireStaffProps) => {
  const { user, isStaff, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (adminOnly ? !isAdmin : !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Accès refusé</h1>
          <p className="text-muted-foreground mb-6">
            {user.email} est connecté mais n'a pas l'accès {adminOnly ? 'admin' : 'staff'}.
            Demandez à un admin de vous l'accorder.
          </p>
          <Button variant="outline" onClick={signOut}>Se déconnecter</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
