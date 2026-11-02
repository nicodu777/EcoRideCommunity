import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

/** Bouton flottant vers la messagerie, avec le nombre de messages non lus. */
export function FloatingMessagesButton() {
  const [, navigate] = useLocation();

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/chat/unread-count"],
    refetchInterval: 15000,
  });

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <Button
        onClick={() => navigate("/messages")}
        aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} non lus)` : ""}`}
        className="w-14 h-14 rounded-full bg-eco-green hover:bg-green-600 shadow-lg relative transition-all duration-200 hover:scale-110"
        size="sm"
      >
        <MessageCircle className="w-6 h-6 text-white" aria-hidden="true" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs font-bold"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}
