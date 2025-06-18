import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ChatWindow } from "@/components/chat/chat-window";

interface FloatingChatButtonProps {
  tripId: number;
  userId: number;
  show: boolean;
}

export function FloatingChatButton({ tripId, userId, show }: FloatingChatButtonProps) {
  const [showChat, setShowChat] = useState(false);

  if (!show) return null;

  return (
    <>
      <Button
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-eco-green hover:bg-green-600 shadow-lg z-40"
        size="sm"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      <ChatWindow
        tripId={tripId}
        userId={userId}
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />
    </>
  );
}