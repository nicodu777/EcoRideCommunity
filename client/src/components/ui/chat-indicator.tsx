import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatIndicatorProps {
  onClick: () => void;
  className?: string;
}

export function ChatIndicator({ onClick, className = "" }: ChatIndicatorProps) {
  return (
    <Button
      onClick={onClick}
      className={`bg-eco-green hover:bg-green-600 text-white shadow-lg ${className}`}
      size="sm"
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Ouvrir le chat
    </Button>
  );
}