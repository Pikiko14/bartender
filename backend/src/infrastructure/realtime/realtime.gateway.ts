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
import { SocketEvents, SocketRooms } from '@shared/realtime/socket-events';
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

  @SubscribeMessage('join:dj-cast')
  joinDjCast(@ConnectedSocket() client: Socket, @MessageBody() businessId: string): void {
    client.join(SocketRooms.djCast(businessId));
  }

  /** Retransmite señales WebRTC para compartir pantalla DJ → TV. */
  @SubscribeMessage('music.share.signal')
  relayDjShareSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { businessId: string; data: unknown },
  ): void {
    if (!body?.businessId) return;
    client.to(SocketRooms.djCast(body.businessId)).emit(SocketEvents.MUSIC_SHARE_SIGNAL, body.data);
  }

  /** La TV avisa que está lista → el emisor reenvía la oferta WebRTC. */
  @SubscribeMessage('music.share.viewer-ready')
  relayShareViewerReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() businessId: string,
  ): void {
    if (!businessId) return;
    client.to(SocketRooms.djCast(businessId)).emit(SocketEvents.MUSIC_SHARE_VIEWER_READY, {});
  }

  /** Sincroniza play/pause entre todos los reproductores del negocio. */
  @SubscribeMessage('music.playback.control')
  relayPlaybackControl(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { businessId: string; action: 'play' | 'pause'; youtubeId: string; at?: number },
  ): void {
    if (!body?.businessId || !body.action || !body.youtubeId) return;
    client.to(SocketRooms.business(body.businessId)).emit(SocketEvents.MUSIC_PLAYBACK_CONTROL, {
      action: body.action,
      youtubeId: body.youtubeId,
      at: body.at,
    });
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
