import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, User, FileText, Settings } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AdminAction {
  id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: number;
  details: any;
  created_at: string;
}

export function AdminActionsLog() {
  const { data: actions = [], isLoading } = useQuery<AdminAction[]>({
    queryKey: ['/api/admin/actions'],
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'suspend_user':
      case 'unsuspend_user':
        return <User className="w-4 h-4" />;
      case 'review_report':
        return <FileText className="w-4 h-4" />;
      case 'create_employee':
        return <User className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'suspend_user':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'unsuspend_user':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'review_report':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'create_employee':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'suspend_user': return 'Suspension utilisateur';
      case 'unsuspend_user': return 'Réactivation utilisateur';
      case 'review_report': return 'Traitement signalement';
      case 'create_employee': return 'Création employé';
      default: return action;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Journal des actions administratives</h2>
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Activity className="w-4 h-4" />
          <span>{actions.length} actions enregistrées</span>
        </div>
      </div>

      <div className="space-y-3">
        {actions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600">Aucune action administrative enregistrée</p>
            </CardContent>
          </Card>
        ) : (
          actions.map((action) => (
            <Card key={action.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(action.action)}
                      <Badge className={getActionColor(action.action)}>
                        {getActionLabel(action.action)}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {action.admin_name} - {action.target_type} #{action.target_id}
                      </p>
                      {action.details && (
                        <p className="text-xs text-slate-600">
                          {action.details.status && `Statut: ${action.details.status}`}
                          {action.details.resolution && ` - ${action.details.resolution.substring(0, 50)}...`}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-500">
                    {format(new Date(action.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}