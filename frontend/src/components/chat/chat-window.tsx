import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChatMessage {
  id: number;
  tripId: number;
  senderId: number;
  message: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string;
}

interface ChatWindowProps {
  tripId: number;
  userId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWindow({ tripId, userId, isOpen, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/trip/${tripId}`],
    enabled: isOpen && !!tripId,
    refetchInterval: 1000, // Refresh every 1 second
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (newMessage: any) => {
      const response = await apiRequest("POST", "/api/chat/messages", newMessage);
      return response;
    },
    onSuccess: async () => {
      // Forcer la mise à jour immédiate des messages
      await queryClient.invalidateQueries({ queryKey: [`/api/chat/trip/${tripId}`] });
      await queryClient.refetchQueries({ queryKey: [`/api/chat/trip/${tripId}`] });
      
      // Scroll vers le bas après l'envoi du message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim() || sendMessageMutation.isPending) return;

    const messageToSend = message.trim();
    setMessage(""); // Clear input immediately

    try {
      await sendMessageMutation.mutateAsync({
        tripId,
        senderId: userId,
        message: messageToSend,
        messageType: "text",
      });
    } catch (error) {
      // Restore message if sending failed
      setMessage(messageToSend);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 sm:w-96 h-[450px] sm:h-[500px] z-50 shadow-2xl border-2 border-eco-green max-w-[calc(100vw-2rem)]">
      <CardHeader className="pb-2 pt-3 bg-eco-green text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            Chat - Trajet #{tripId}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-green-600 h-8 w-8 p-0">
            <span className="text-lg">×</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex flex-col h-80 sm:h-96">
        <ScrollArea className="flex-1 px-3 sm:px-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-eco-green border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.id}-${index}-${msg.createdAt}`}
                  className={`flex ${msg.senderId === userId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 ${
                      msg.senderId === userId
                        ? "bg-eco-green text-white rounded-br-md"
                        : "bg-slate-100 text-slate-900 rounded-bl-md"
                    }`}
                  >
                    <div className="text-sm leading-relaxed break-words">{msg.message}</div>
                    <div
                      className={`text-xs mt-1 ${
                        msg.senderId === userId ? "text-green-100" : "text-slate-500"
                      }`}
                    >
                      {format(new Date(msg.createdAt), "HH:mm", { locale: fr })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        <div className="p-3 sm:p-4 border-t bg-white">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tapez votre message..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={sendMessageMutation.isPending}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="bg-eco-green hover:bg-green-600 px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}