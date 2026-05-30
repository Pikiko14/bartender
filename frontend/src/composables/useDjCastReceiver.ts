import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { realtime, type DjShareSignalPayload } from '@/socket/socket';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/** Modo TV espejo: recibe la transmisión WebRTC de la ventana DJ compartida. */
export function useDjCastReceiver(
  businessId: Ref<string>,
  videoRef: Ref<HTMLVideoElement | null>,
  enabled: Ref<boolean> | (() => boolean) = () => true,
) {
  const receiving = ref(false);
  const waiting = ref(true);
  let pc: RTCPeerConnection | null = null;
  let activeId = '';
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

  function attachVideoTrack(track: MediaStreamTrack) {
    const el = videoRef.value;
    if (!el) return;

    const stream = new MediaStream([track]);
    el.srcObject = stream;

    const markLive = () => {
      receiving.value = true;
      waiting.value = false;
    };

    el.onloadeddata = markLive;
    track.onunmute = markLive;

    void el
      .play()
      .then(() => {
        markLive();
        el.muted = false;
      })
      .catch(() => {
        el.muted = true;
        void el.play().then(markLive).catch(() => undefined);
      });
  }

  const onSignal = async (data: DjShareSignalPayload) => {
    if (!activeId) return;
    try {
      if (data.sdp?.type === 'offer') {
        pc?.close();
        pendingCandidates = [];
        remoteDescriptionSet = false;
        receiving.value = false;
        waiting.value = true;

        pc = createPeer(activeId);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescriptionSet = true;
        await flushCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        realtime.emitDjShareSignal(activeId, { sdp: pc.localDescription!.toJSON() });
      } else if (data.candidate) {
        if (!pc || !remoteDescriptionSet) {
          pendingCandidates.push(data.candidate);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch {
      waiting.value = true;
      receiving.value = false;
    }
  };

  function createPeer(id: string): RTCPeerConnection {
    const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    conn.ontrack = (ev) => {
      if (ev.track.kind !== 'video') return;
      attachVideoTrack(ev.track);
    };

    conn.onicecandidate = (ev) => {
      if (ev.candidate) {
        realtime.emitDjShareSignal(id, { candidate: ev.candidate.toJSON() });
      }
    };

    conn.onconnectionstatechange = () => {
      if (conn.connectionState === 'connected') {
        waiting.value = false;
      }
      if (conn.connectionState === 'disconnected' || conn.connectionState === 'failed') {
        receiving.value = false;
        waiting.value = true;
        if (videoRef.value) videoRef.value.srcObject = null;
      }
    };

    return conn;
  }

  function announceViewerReady(id: string) {
    realtime.emitShareViewerReady(id);
    window.setTimeout(() => realtime.emitShareViewerReady(id), 800);
    window.setTimeout(() => realtime.emitShareViewerReady(id), 2500);
  }

  function setup(id: string) {
    if (activeId === id) return;
    teardown();
    activeId = id;
    realtime.joinDjCast(id);
    realtime.onDjShareSignal(onSignal);
    window.setTimeout(() => announceViewerReady(id), 150);
  }

  function teardown() {
    realtime.offDjShareSignal(onSignal);
    pc?.close();
    pc = null;
    activeId = '';
    pendingCandidates = [];
    remoteDescriptionSet = false;
    receiving.value = false;
    waiting.value = true;
    if (videoRef.value) {
      videoRef.value.onloadeddata = null;
      videoRef.value.srcObject = null;
    }
  }

  function isEnabled() {
    return typeof enabled === 'function' ? enabled() : enabled.value;
  }

  watch(
    businessId,
    (id) => {
      if (!isEnabled()) {
        teardown();
        return;
      }
      if (id) setup(id);
    },
    { immediate: true },
  );

  watch(
    () => (typeof enabled === 'function' ? enabled() : enabled.value),
    (on) => {
      if (!on) teardown();
      else if (businessId.value) setup(businessId.value);
    },
  );

  onBeforeUnmount(teardown);

  return { receiving, waiting };
}
