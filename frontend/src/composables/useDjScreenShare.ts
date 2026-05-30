import { ref, onBeforeUnmount } from 'vue';
import { realtime, SocketEvents, type DjShareSignalPayload } from '@/socket/socket';
import { openDjShareWindow } from '@/shared/dj-share';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * Comparte la ventana DJ en TVs usando getDisplayMedia + WebRTC (estilo Meet/Teams).
 * 1. Abre ventana DJ dedicada
 * 2. Diálogo nativo del navegador → el usuario elige esa ventana
 * 3. La señal va por WebSocket a las TVs en modo receptor (?tv=1)
 */
export function useDjScreenShare(businessId: () => string | null | undefined) {
  const sharing = ref(false);
  const error = ref<string | null>(null);
  let pc: RTCPeerConnection | null = null;
  let stream: MediaStream | null = null;
  let popup: Window | null = null;
  let pendingCandidates: RTCIceCandidateInit[] = [];
  let remoteDescriptionSet = false;

  async function flushCandidates() {
    if (!pc || !remoteDescriptionSet) return;
    for (const c of pendingCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore ICE race */
      }
    }
    pendingCandidates = [];
  }

  async function sendOffer(id: string, iceRestart = false) {
    if (!pc) return;
    const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
    await pc.setLocalDescription(offer);
    realtime.emitDjShareSignal(id, { sdp: pc.localDescription!.toJSON() });
  }

  const onSignal = async (data: DjShareSignalPayload) => {
    if (!pc) return;
    try {
      if (data.sdp?.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescriptionSet = true;
        await flushCandidates();
      } else if (data.candidate) {
        if (!remoteDescriptionSet) {
          pendingCandidates.push(data.candidate);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch {
      /* ignore ICE race */
    }
  };

  const onViewerReady = () => {
    const id = businessId();
    if (!id || !sharing.value || !pc || !stream) return;
    void sendOffer(id, true).catch(() => undefined);
  };

  async function startShare(
    businessSlug: string,
    options: { openPopup?: boolean } = {},
  ): Promise<boolean> {
    const id = businessId();
    if (!id) {
      error.value = 'No hay negocio asociado.';
      return false;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      error.value = 'Tu navegador no soporta compartir pantalla.';
      return false;
    }

    stopShare();
    error.value = null;

    const openPopup = options.openPopup ?? true;
    if (openPopup) {
      popup = openDjShareWindow(businessSlug);
      await new Promise((r) => setTimeout(r, 800));
    }

    try {
      realtime.joinDjCast(id);
      realtime.onDjShareSignal(onSignal);
      realtime.on(SocketEvents.MUSIC_SHARE_VIEWER_READY, onViewerReady);

      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      if (!stream.getVideoTracks().length) {
        throw new Error('No se capturó video. Elige una ventana con imagen.');
      }

      stream.getVideoTracks()[0]?.addEventListener('ended', () => stopShare());

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          realtime.emitDjShareSignal(id, { candidate: ev.candidate.toJSON() });
        }
      };

      await sendOffer(id);
      sharing.value = true;
      return true;
    } catch (e) {
      error.value =
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Compartir pantalla cancelado.'
          : e instanceof Error
            ? e.message
            : 'No se pudo iniciar la transmisión.';
      stopShare();
      return false;
    }
  }

  function stopShare() {
    sharing.value = false;
    realtime.offDjShareSignal(onSignal);
    realtime.off(SocketEvents.MUSIC_SHARE_VIEWER_READY, onViewerReady);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    pc?.close();
    pc = null;
    pendingCandidates = [];
    remoteDescriptionSet = false;
    popup?.close();
    popup = null;
  }

  onBeforeUnmount(stopShare);

  return { sharing, error, startShare, stopShare };
}
