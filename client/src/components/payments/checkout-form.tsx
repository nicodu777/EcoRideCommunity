import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Shield, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TripWithDriver } from "@shared/schema";

interface CheckoutFormProps {
  trip: TripWithDriver;
  seatsBooked: number;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

export function CheckoutForm({ trip, seatsBooked, onPaymentSuccess, onCancel }: CheckoutFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const totalPrice = parseFloat(trip.pricePerSeat) * seatsBooked;
  const platformFee = totalPrice * 0.05;
  const finalTotal = totalPrice + platformFee;

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return apiRequest("POST", "/api/payments/create-intent", paymentData);
    },
    onSuccess: async () => {
      setIsProcessing(true);
      
      setTimeout(() => {
        toast({
          title: "Paiement réussi !",
          description: "Votre réservation a été confirmée.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        onPaymentSuccess();
        setIsProcessing(false);
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Erreur de paiement",
        description: "Le paiement a échoué. Veuillez réessayer.",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handlePayment = () => {
    createPaymentMutation.mutate({
      tripId: trip.id,
      amount: finalTotal,
      seatsBooked,
      currency: "EUR",
    });
  };

  if (isProcessing) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-eco-green border-t-transparent rounded-full mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Traitement du paiement...
          </h3>
          <p className="text-slate-600">
            Veuillez patienter, votre paiement est en cours de traitement.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-eco-green" />
          Finaliser la réservation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-eco-green rounded-full"></div>
            <span className="text-sm font-medium">{trip.departure}</span>
          </div>
          <div className="w-px h-4 bg-slate-300 ml-1.5"></div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-eco-blue rounded-full"></div>
            <span className="text-sm font-medium">{trip.destination}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Conducteur</span>
          <span className="font-medium">
            {trip.driver.firstName} {trip.driver.lastName}
          </span>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{seatsBooked} place{seatsBooked > 1 ? 's' : ''} × {parseFloat(trip.pricePerSeat).toFixed(2)}€</span>
            <span>{totalPrice.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Frais de service (5%)</span>
            <span>{platformFee.toFixed(2)}€</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{finalTotal.toFixed(2)}€</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-700">
            Paiement sécurisé par Stripe
          </span>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handlePayment}
            disabled={createPaymentMutation.isPending}
            className="w-full bg-eco-green hover:bg-green-600"
          >
            {createPaymentMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Traitement...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Payer {finalTotal.toFixed(2)}€
              </div>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={createPaymentMutation.isPending}
            className="w-full"
          >
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}