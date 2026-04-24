import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Brain, MapPin, Clock, Euro } from "lucide-react";

interface AIRecommendation {
  id: string;
  type: "price" | "route" | "timing" | "demand";
  title: string;
  description: string;
  confidence: number;
  impact: "high" | "medium" | "low";
  suggestedAction?: string;
}

interface AIRecommendationsProps {
  userId: number;
  userRole: string;
}

export function AIRecommendations({ userId, userRole }: AIRecommendationsProps) {
  const { data: recommendations = [], isLoading } = useQuery<AIRecommendation[]>({
    queryKey: [`/api/ai/recommendations/${userId}`],
    staleTime: 5 * 60 * 1000,
  });

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "price":
        return <Euro className="w-4 h-4 text-green-600" />;
      case "route":
        return <MapPin className="w-4 h-4 text-blue-600" />;
      case "timing":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "demand":
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      default:
        return <Brain className="w-4 h-4 text-slate-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Recommandations IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Recommandations IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Aucune recommandation disponible pour le moment
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getRecommendationIcon(rec.type)}
                    <h4 className="font-medium text-slate-900">{rec.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getImpactColor(rec.impact)}>
                      {rec.impact === "high" ? "Fort impact" : 
                       rec.impact === "medium" ? "Impact moyen" : "Faible impact"}
                    </Badge>
                    <Badge variant="outline">
                      {rec.confidence}% confiance
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mb-2">
                  {rec.description}
                </p>
                
                {rec.suggestedAction && (
                  <div className="text-sm font-medium text-purple-600">
                    💡 {rec.suggestedAction}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}