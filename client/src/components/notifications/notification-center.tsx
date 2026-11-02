/**
 * Cloche de notifications (trajet annulé par le chauffeur, trajet à valider...).
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { apiJson, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000,
  });

  const markAsRead = useMutation({
    mutationFn: (id: number) => apiJson("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={`Notifications (${unreadCount} non lues)`}>
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs p-0">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b"><h2 className="font-semibold">Notifications</h2></div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-slate-500">Aucune notification</p>
          ) : (
            <ul className="p-2">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`w-full text-left p-3 rounded-lg mb-2 ${n.isRead ? "bg-slate-50" : "bg-blue-50 border border-blue-200"}`}
                    onClick={() => !n.isRead && markAsRead.mutate(n.id)}
                  >
                    <p className={`text-sm ${n.isRead ? "text-slate-600" : "text-slate-900 font-medium"}`}>{n.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{format(new Date(n.createdAt), "dd MMM à HH:mm", { locale: fr })}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
