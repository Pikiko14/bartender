import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketRooms } from '@shared/realtime/socket-events';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly realtime: RealtimeService) {}

  afterInit(server: Server): void {
    this.realtime.setServer(server);
    this.logger.log('Gateway realtime inicializado.');
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('join:business')
  joinBusiness(@ConnectedSocket() client: Socket, @MessageBody() businessId: string): void {
    client.join(SocketRooms.business(businessId));
  }

  @SubscribeMessage('join:kitchen')
  joinKitchen(@ConnectedSocket() client: Socket, @MessageBody() businessId: string): void {
    client.join(SocketRooms.kitchen(businessId));
  }

  @SubscribeMessage('join:bar')
  joinBar(@ConnectedSocket() client: Socket, @MessageBody() businessId: string): void {
    client.join(SocketRooms.bar(businessId));
  }

  @SubscribeMessage('join:table')
  joinTable(@ConnectedSocket() client: Socket, @MessageBody() tableId: string): void {
    client.join(SocketRooms.table(tableId));
  }

  @SubscribeMessage('leave:room')
  leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string): void {
    client.leave(room);
  }
}
