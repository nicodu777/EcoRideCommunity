import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type Server } from 'http';

interface ConnectedClient {
  ws: WebSocket;
  userId: number;
  tripId?: number;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();

  init(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');
      const tripId = url.searchParams.get('tripId');

      if (!userId) {
        ws.close(1000, 'Missing userId');
        return;
      }

      const clientId = `${userId}-${Date.now()}`;
      this.clients.set(clientId, {
        ws,
        userId: parseInt(userId),
        tripId: tripId ? parseInt(tripId) : undefined
      });

      console.log(`WebSocket client connected: ${clientId}`);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
    });
  }

  private handleMessage(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'join_trip':
        client.tripId = data.tripId;
        this.broadcastToTrip(data.tripId, {
          type: 'user_joined',
          userId: client.userId,
          message: 'Un utilisateur a rejoint le chat'
        }, client.userId);
        break;

      case 'chat_message':
        if (client.tripId) {
          this.broadcastToTrip(client.tripId, {
            type: 'new_message',
            message: data.message,
            senderId: client.userId,
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'location_update':
        if (client.tripId) {
          this.broadcastToTrip(client.tripId, {
            type: 'location_update',
            userId: client.userId,
            location: data.location,
            timestamp: new Date().toISOString()
          }, client.userId);
        }
        break;
    }
  }

  broadcastToTrip(tripId: number, message: any, excludeUserId?: number) {
    this.clients.forEach((client, clientId) => {
      if (client.tripId === tripId && 
          client.userId !== excludeUserId && 
          client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  sendToUser(userId: number, message: any) {
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  broadcastNotification(userId: number, notification: any) {
    this.sendToUser(userId, {
      type: 'notification',
      data: notification
    });
  }
}

export const wsManager = new WebSocketManager();