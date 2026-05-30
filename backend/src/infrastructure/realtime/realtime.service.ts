import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketRooms } from '@shared/realtime/socket-events';

/**
 * Punto único de emisión de eventos realtime. Los módulos de dominio inyectan
 * este servicio y emiten sin acoplarse al gateway de Socket.io.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  private emit(room: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`Socket server no inicializado; evento "${event}" descartado.`);
      return;
    }
    this.server.to(room).emit(event, payload);
  }

  emitToBusiness(businessId: string, event: string, payload: unknown): void {
    this.emit(SocketRooms.business(businessId), event, payload);
  }

  emitToKitchen(businessId: string, event: string, payload: unknown): void {
    this.emit(SocketRooms.kitchen(businessId), event, payload);
  }

  emitToBar(businessId: string, event: string, payload: unknown): void {
    this.emit(SocketRooms.bar(businessId), event, payload);
  }

  emitToTable(tableId: string, event: string, payload: unknown): void {
    this.emit(SocketRooms.table(tableId), event, payload);
  }
}
