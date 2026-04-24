import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Leaf, Users, Target, Award } from "lucide-react";

interface BadgeType {
  id: number;
  name: string;
  description: string;
  icon: string;
  condition: string;
  points: number;
  isActive: boolean;
  createdAt: string;
}

interface UserBadge {
  id: number;
  userId: number;
  badgeId: number;
  earnedAt: string;
  badge?: BadgeType;
}

interface BadgeDisplayProps {
  userId: number;
  ecoPoints: number;
  compact?: boolean;
}

export function BadgeDisplay({ userId, ecoPoints, compact = false }: BadgeDisplayProps) {
  const { data: userBadges = [] } = useQuery<UserBadge[]>({
    queryKey: [`/api/badges/user/${userId}`],
  });

  const { data: availableBadges = [] } = useQuery<BadgeType[]>({
    queryKey: ["/api/badges"],
  });

  const earnedBadgeIds = userBadges.map(ub => ub.badgeId);
  const nextBadges = availableBadges.filter(badge => !earnedBadgeIds.includes(badge.id)).slice(0, 3);

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case "trophy":
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case "star":
        return <Star className="w-6 h-6 text-blue-500" />;
      case "leaf":
        return <Leaf className="w-6 h-6 text-green-500" />;
      case "users":
        return <Users className="w-6 h-6 text-purple-500" />;
      case "target":
        return <Target className="w-6 h-6 text-red-500" />;
      default:
        return <Award className="w-6 h-6 text-slate-500" />;
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Points Éco</span>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Leaf className="w-3 h-3 mr-1" />
            {ecoPoints} pts
          </Badge>
        </div>
        
        {userBadges.length > 0 && (
          <div>
            <span className="text-sm font-medium text-slate-700 block mb-2">Badges obtenus</span>
            <div className="flex flex-wrap gap-2">
              {userBadges.slice(0, 4).map((userBadge) => (
                <div
                  key={userBadge.id}
                  className="flex items-center gap-1 bg-slate-50 rounded-full px-2 py-1"
                  title={userBadge.badge?.description}
                >
                  {getBadgeIcon(userBadge.badge?.icon || "award")}
                  <span className="text-xs font-medium">{userBadge.badge?.name}</span>
                </div>
              ))}
              {userBadges.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{userBadges.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            Points Éco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{ecoPoints}</div>
            <div className="text-sm text-slate-600">points gagnés</div>
          </div>
        </CardContent>
      </Card>

      {userBadges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Badges obtenus ({userBadges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {userBadges.map((userBadge) => (
                <div
                  key={userBadge.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  {getBadgeIcon(userBadge.badge?.icon || "award")}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900">
                      {userBadge.badge?.name}
                    </div>
                    <div className="text-xs text-slate-600">
                      +{userBadge.badge?.points} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {nextBadges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-slate-500" />
              Prochains objectifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nextBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200"
                >
                  <div className="opacity-50">
                    {getBadgeIcon(badge.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900">
                      {badge.name}
                    </div>
                    <div className="text-xs text-slate-600 mb-2">
                      {badge.description}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={30} className="flex-1 h-2" />
                      <span className="text-xs text-slate-500">+{badge.points} pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}