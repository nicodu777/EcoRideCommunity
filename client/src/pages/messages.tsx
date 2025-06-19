import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search, ArrowLeft, Send } from "lucide-react";
import { ChatWindow } from "@/components/chat/chat-window";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "wouter";

interface Conversation {
  tripId: number;
  tripInfo: {
    departure: string;
    destination: string;
    departureTime: string;
    driverName: string;
  };
  lastMessage: {
    message: string;
    senderName: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((authUser) => {
      setUser(authUser);
    });
    return unsubscribe;
  }, []);

  // Récupérer toutes les conversations de l'utilisateur
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: [`/api/chat/conversations/${user?.profile?.id}`],
    enabled: !!user?.profile?.id,
  });

  if (!user?.profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eco-green border-t-transparent rounded-full" />
      </div>
    );
  }

  // Filtrer les conversations selon la recherche
  const filteredConversations = conversations.filter(conv =>
    conv.tripInfo.departure.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.tripInfo.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.tripInfo.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedTripId) {
    return (
      <ChatWindow
        tripId={selectedTripId}
        userId={user.profile.id}
        isOpen={true}
        onClose={() => setSelectedTripId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-7 h-7 text-eco-green" />
              Mes Messages
            </h1>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Conversations</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher une conversation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-eco-green border-t-transparent rounded-full" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? "Aucune conversation trouvée" : "Aucune conversation"}
                </h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? "Essayez avec d'autres mots-clés" 
                    : "Vos conversations avec les covoitureurs apparaîtront ici"
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="divide-y divide-gray-200">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.tripId}
                      onClick={() => setSelectedTripId(conversation.tripId)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {conversation.tripInfo.departure} → {conversation.tripInfo.destination}
                            </h3>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            Avec {conversation.tripInfo.driverName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(conversation.tripInfo.departureTime), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                          {conversation.lastMessage && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-700 truncate">
                                <span className="font-medium">{conversation.lastMessage.senderName}:</span>{' '}
                                {conversation.lastMessage.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {format(new Date(conversation.lastMessage.createdAt), "d/MM 'à' HH:mm", { locale: fr })}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center">
                          <Button variant="ghost" size="sm" className="text-eco-green hover:bg-eco-green hover:text-white">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}