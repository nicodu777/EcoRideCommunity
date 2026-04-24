import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Eye, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserReport {
  id: number;
  reporter_name: string;
  reported_name: string;
  reason: string;
  description: string;
  status: string;
  priority: string;
  reviewer_name?: string;
  resolution?: string;
  created_at: string;
  reviewed_at?: string;
}

export function ReportsManagement() {
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [resolution, setResolution] = useState("");
  const { toast } = useToast();

  const { data: reports = [], isLoading } = useQuery<UserReport[]>({
    queryKey: ['/api/admin/reports'],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, resolution }: { id: number; status: string; resolution: string }) => {
      return apiRequest("POST", `/api/admin/reports/${id}/review`, { status, resolution });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      toast({
        title: "Signalement traité",
        description: "Le signalement a été traité avec succès.",
      });
      setSelectedReport(null);
      setReviewStatus("");
      setResolution("");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de traiter le signalement.",
        variant: "destructive",
      });
    },
  });

  const handleReview = () => {
    if (!selectedReport || !reviewStatus || !resolution.trim()) return;
    
    reviewMutation.mutate({
      id: selectedReport.id,
      status: reviewStatus,
      resolution: resolution.trim(),
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'dismissed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
        <h2 className="text-2xl font-bold text-slate-900">Gestion des signalements</h2>
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <AlertTriangle className="w-4 h-4" />
          <span>{reports.filter(r => r.status === 'pending').length} en attente</span>
        </div>
      </div>

      <div className="grid gap-4">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600">Aucun signalement pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-slate-900">
                        {report.reporter_name} signale {report.reported_name}
                      </h3>
                      <Badge className={getPriorityColor(report.priority)}>
                        {report.priority}
                      </Badge>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2">
                      <strong>Motif:</strong> {report.reason}
                    </p>
                    
                    {report.description && (
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Description:</strong> {report.description}
                      </p>
                    )}
                    
                    <p className="text-xs text-slate-500">
                      Signalé le {format(new Date(report.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                    
                    {report.reviewed_at && report.reviewer_name && (
                      <p className="text-xs text-slate-500">
                        Traité par {report.reviewer_name} le {format(new Date(report.reviewed_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Détails du signalement #{report.id}</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-slate-700">Signaleur</label>
                              <p className="text-slate-900">{report.reporter_name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700">Utilisateur signalé</label>
                              <p className="text-slate-900">{report.reported_name}</p>
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-slate-700">Motif</label>
                            <p className="text-slate-900">{report.reason}</p>
                          </div>
                          
                          {report.description && (
                            <div>
                              <label className="text-sm font-medium text-slate-700">Description détaillée</label>
                              <p className="text-slate-900">{report.description}</p>
                            </div>
                          )}
                          
                          {report.resolution && (
                            <div>
                              <label className="text-sm font-medium text-slate-700">Résolution</label>
                              <p className="text-slate-900">{report.resolution}</p>
                            </div>
                          )}
                          
                          {report.status === 'pending' && (
                            <div className="space-y-4 border-t pt-4">
                              <h4 className="font-medium text-slate-900">Traiter ce signalement</h4>
                              
                              <div>
                                <label className="text-sm font-medium text-slate-700">Statut</label>
                                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choisir un statut" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="reviewed">En cours de traitement</SelectItem>
                                    <SelectItem value="resolved">Résolu</SelectItem>
                                    <SelectItem value="dismissed">Rejeté</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-slate-700">Résolution</label>
                                <Textarea
                                  value={resolution}
                                  onChange={(e) => setResolution(e.target.value)}
                                  placeholder="Expliquez la résolution de ce signalement..."
                                  rows={3}
                                />
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button
                                  onClick={handleReview}
                                  disabled={!reviewStatus || !resolution.trim() || reviewMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Traiter
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
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