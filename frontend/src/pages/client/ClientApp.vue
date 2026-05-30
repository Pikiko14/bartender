<template>
  <div class="mx-auto min-h-screen max-w-xl pb-28">
    <!-- Estado de carga / error -->
    <div v-if="loading" class="flex min-h-screen items-center justify-center text-slate-400">
      Cargando carta…
    </div>
    <div
      v-else-if="error"
      class="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <p class="text-lg font-semibold text-red-400">{{ error }}</p>
      <RouterLink to="/" class="btn-ghost">Volver</RouterLink>
    </div>

    <template v-else>
      <!-- Cabecera negocio -->
      <header class="relative overflow-hidden border-b border-ink-700 bg-ink-900/70 px-5 pb-4 pt-6">
        <h1 class="text-2xl font-extrabold">{{ business?.name }}</h1>
        <p class="text-sm text-slate-400">{{ table?.name }} · {{ business?.description }}</p>
      </header>

      <!-- Tabs -->
      <nav class="sticky top-0 z-10 flex border-b border-ink-700 bg-ink-950/90 backdrop-blur">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="flex-1 py-3 text-sm font-semibold transition"
          :class="tab === t.id ? 'border-b-2 border-neon-pink text-neon-pink' : 'text-slate-400'"
          @click="tab = t.id"
        >
          {{ t.label }}
          <span v-if="t.id === 'orders' && myOrders.length" class="ml-1 text-xs"
            >({{ myOrders.length }})</span
          >
        </button>
      </nav>

      <!-- CARTA -->
      <section v-show="tab === 'menu'" class="px-5 py-4">
        <div v-for="cat in menu" :key="cat.id" class="mb-8">
          <MenuImage
            v-if="cat.image"
            :src="cat.image"
            :alt="cat.name"
            size="banner"
            :fallback-icon="categoryIcon(cat.type)"
            class="mb-3"
          />
          <h2 class="mb-3 flex items-center gap-2 text-lg font-bold text-slate-200">
            <span v-if="!cat.image" class="text-xl">{{ categoryIcon(cat.type) }}</span>
            {{ cat.name }}
          </h2>
          <div class="space-y-3">
            <div
              v-for="item in cat.items"
              :key="item.id"
              class="card flex items-center gap-3 overflow-hidden p-3"
            >
              <MenuImage :src="item.image" :alt="item.name" size="card" />
              <div class="min-w-0 flex-1">
                <p class="font-semibold">{{ item.name }}</p>
                <p v-if="item.description" class="line-clamp-2 text-xs text-slate-500">
                  {{ item.description }}
                </p>
                <p class="mt-1 text-sm font-bold text-neon-cyan">{{ formatMoney(item.price) }}</p>
              </div>
              <button
                class="btn-primary h-9 w-9 shrink-0 rounded-full p-0 text-lg"
                @click="addToCart(item)"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- MIS PEDIDOS -->
      <section v-show="tab === 'orders'" class="px-5 py-4">
        <div v-if="tableClosed" class="card mb-4 border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          La cuenta de esta mesa fue cerrada. Escanea el QR de nuevo para pedir.
        </div>

        <div v-if="bill.lines.length" class="card mb-4 p-4">
          <h2 class="text-lg font-bold">Cuenta de la mesa</h2>
          <p class="text-xs text-slate-500">{{ table?.name }} · {{ bill.orderCount }} pedido(s)</p>
          <ul class="mt-3 space-y-2">
            <li v-for="line in bill.lines" :key="line.menuItemId" class="flex justify-between text-sm">
              <span>{{ line.quantity }}× {{ line.name }}</span>
              <span class="font-medium">{{ formatMoney(line.subtotal) }}</span>
            </li>
          </ul>
          <p class="mt-3 border-t border-ink-700 pt-3 text-right text-lg font-bold text-neon-cyan">
            Total {{ formatMoney(bill.total) }}
          </p>
        </div>

        <h2 class="mb-3 text-lg font-bold">Detalle por pedido</h2>
        <div v-if="myOrders.length" class="space-y-3">
          <div v-for="o in myOrders" :key="o.id" class="card p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">#{{ o.id.slice(-5) }}</span>
              <span class="badge" :class="ORDER_STATUS_CLASS[o.status]">{{
                ORDER_STATUS_LABEL[o.status]
              }}</span>
            </div>
            <ul class="mt-2 space-y-1">
              <OrderItemLine v-for="(it, i) in o.items" :key="i" :item="it" />
            </ul>
            <p class="mt-2 text-right text-sm font-bold">{{ formatMoney(o.total) }}</p>
          </div>
        </div>
        <p v-else class="text-sm text-slate-500">Aún no hay pedidos en esta mesa.</p>
      </section>

      <!-- MÚSICA -->
      <section v-show="tab === 'music'" class="px-5 py-4">
        <div v-if="queue.nowPlaying" class="card mb-4 flex items-center gap-3 p-3">
          <img :src="queue.nowPlaying.thumbnail ?? ''" class="h-12 w-20 rounded object-cover" />
          <div class="min-w-0">
            <p class="text-xs text-neon-pink">▶ Sonando</p>
            <p class="truncate text-sm font-semibold">{{ queue.nowPlaying.title }}</p>
          </div>
        </div>

        <form class="flex gap-2" @submit.prevent="search">
          <input v-model="musicQuery" class="input" placeholder="Busca una canción…" />
          <button class="btn-cyan text-sm">Buscar</button>
        </form>

        <div v-if="results.length" class="mt-4 space-y-2">
          <div v-for="v in results" :key="v.youtubeId" class="card flex items-center gap-3 p-2">
            <img :src="v.thumbnail" class="h-10 w-16 rounded object-cover" />
            <span class="flex-1 truncate text-sm">{{ v.title }}</span>
            <button class="btn-primary px-3 py-1.5 text-xs" @click="request(v)">Pedir</button>
          </div>
        </div>

        <h3 class="mb-2 mt-6 font-semibold">En cola ({{ queue.queue.length }})</h3>
        <div class="space-y-2">
          <div v-for="s in queue.queue" :key="s.id" class="card flex items-center gap-3 p-2">
            <img :src="s.thumbnail ?? ''" class="h-10 w-16 rounded object-cover" />
            <span class="flex-1 truncate text-sm">{{ s.title }}</span>
            <button class="btn-ghost px-3 py-1.5 text-xs" @click="vote(s.id)">
              ▲ {{ s.votes }}
            </button>
          </div>
          <p v-if="!queue.queue.length" class="text-sm text-slate-500">
            La cola está vacía. ¡Pide la primera!
          </p>
        </div>
      </section>

      <!-- Carrito flotante -->
      <div
        v-if="cart.length"
        class="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-ink-700 bg-ink-900/95 p-4 backdrop-blur"
      >
        <div class="mb-2 max-h-32 space-y-1 overflow-y-auto">
          <div
            v-for="line in cart"
            :key="line.item.id"
            class="flex items-center justify-between text-sm"
          >
            <span>{{ line.qty }}× {{ line.item.name }}</span>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">{{ formatMoney(line.item.price * line.qty) }}</span>
              <button class="text-red-400" @click="removeFromCart(line.item.id)">✕</button>
            </div>
          </div>
        </div>
        <button
          class="btn-primary w-full"
          :disabled="sending || tableClosed"
          @click="submitOrder"
        >
          {{ tableClosed ? 'Mesa cerrada' : sending ? 'Enviando…' : `Enviar pedido · ${formatMoney(cartTotal)}` }}
        </button>
      </div>
    </template>

    <ToastHost />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import MenuImage from '@/components/MenuImage.vue';
import OrderItemLine from '@/components/OrderItemLine.vue';
import { publicApi } from '@/services/api';
import { realtime, SocketEvents } from '@/socket/socket';
import { formatMoney } from '@/shared/format';
import { categoryIcon } from '@/shared/menu-icons';
import { ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from '@/shared/order-status';
import { apiErrorMessage } from '@/services/http';
import { setDocumentTitle } from '@/shared/document-title';
import { useToast } from '@/composables/useToast';
import ToastHost from '@/components/ToastHost.vue';
import type {
  Business,
  MenuCategory,
  MenuItem,
  MusicQueue,
  Order,
  TableBill,
  TableEntity,
  YoutubeVideo,
} from '@/shared/types';

const route = useRoute();
const toast = useToast();

const loading = ref(true);
const error = ref('');
const tab = ref<'menu' | 'orders' | 'music'>('menu');
const tabs = [
  { id: 'menu' as const, label: 'Carta' },
  { id: 'orders' as const, label: 'Pedidos' },
  { id: 'music' as const, label: 'Música' },
];

const business = ref<Business | null>(null);
const table = ref<TableEntity | null>(null);
const sessionId = ref('');
const tableSessionId = ref('');
const tableClosed = ref(false);
const menu = ref<MenuCategory[]>([]);
const myOrders = ref<Order[]>([]);
const bill = reactive<TableBill>({
  tableSession: {
    id: '',
    businessId: '',
    tableId: '',
    status: 'open',
    openedAt: '',
    closedAt: null,
  },
  tableId: '',
  orders: [],
  lines: [],
  orderCount: 0,
  total: 0,
});

const cart = reactive<Array<{ item: MenuItem; qty: number }>>([]);
const sending = ref(false);
const cartTotal = computed(() => cart.reduce((acc, l) => acc + l.item.price * l.qty, 0));

const musicQuery = ref('');
const results = ref<YoutubeVideo[]>([]);
const queue = reactive<MusicQueue>({ nowPlaying: null, queue: [] });

function addToCart(item: MenuItem) {
  const line = cart.find((l) => l.item.id === item.id);
  if (line) line.qty += 1;
  else cart.push({ item, qty: 1 });
}
function removeFromCart(id: string) {
  const idx = cart.findIndex((l) => l.item.id === id);
  if (idx >= 0) cart.splice(idx, 1);
}

async function refreshTableData() {
  if (!sessionId.value) return;
  const [orders, billData] = await Promise.all([
    publicApi.ordersByTableSession(sessionId.value).catch(() => []),
    publicApi.tableBill(sessionId.value).catch(() => null),
  ]);
  myOrders.value = orders;
  if (billData) {
    bill.tableSession = billData.tableSession;
    bill.tableId = billData.tableId;
    bill.tableName = billData.tableName;
    bill.tableNumber = billData.tableNumber;
    bill.orders = billData.orders;
    bill.lines = billData.lines;
    bill.orderCount = billData.orderCount;
    bill.total = billData.total;
    tableClosed.value = billData.closed === true || billData.tableSession?.status === 'closed';
    tableSessionId.value = billData.tableSession?.id ?? tableSessionId.value;
  }
}

async function submitOrder() {
  if (tableClosed.value) {
    toast.error('La mesa está cerrada. Escanea el QR de nuevo.');
    return;
  }
  sending.value = true;
  try {
    await publicApi.createOrder({
      sessionId: sessionId.value,
      items: cart.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
    });
    cart.splice(0, cart.length);
    tab.value = 'orders';
    await refreshTableData();
    toast.success('¡Pedido enviado!');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    sending.value = false;
  }
}

async function search() {
  if (!musicQuery.value.trim()) return;
  try {
    results.value = await publicApi.searchMusic(musicQuery.value);
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function request(v: YoutubeVideo) {
  try {
    await publicApi.requestSong({
      sessionId: sessionId.value,
      youtubeId: v.youtubeId,
      title: v.title,
      thumbnail: v.thumbnail,
      channelTitle: v.channelTitle,
    });
    toast.success('Canción pedida. El staff la revisará.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function vote(id: string) {
  try {
    await publicApi.voteSong(id, sessionId.value);
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

function sessionKey() {
  return `bartender.guest.${route.params.businessSlug}.${route.params.tableSlug}`;
}

onMounted(async () => {
  const businessSlug = String(route.params.businessSlug);
  const tableSlug = String(route.params.tableSlug);
  try {
    const storedSession = localStorage.getItem(sessionKey()) ?? undefined;
    const scan = await publicApi.scan(businessSlug, tableSlug, storedSession);
    business.value = scan.business;
    table.value = scan.table;
    setDocumentTitle(`${scan.table.name} · ${scan.business.name}`);
    sessionId.value = scan.session.sessionId;
    tableSessionId.value = scan.tableSession.id;
    tableClosed.value = scan.tableSession.status === 'closed';
    localStorage.setItem(sessionKey(), sessionId.value);

    menu.value = await publicApi.menu(businessSlug);
    await refreshTableData();

    const q = await publicApi.publicQueue(businessSlug).catch(() => ({ nowPlaying: null, queue: [] }));
    queue.nowPlaying = q.nowPlaying;
    queue.queue = q.queue;

    realtime.joinTable(scan.table.id);
    realtime.joinBusiness(scan.business.id);
    realtime.on<Order>(SocketEvents.ORDER_CREATED, () => {
      void refreshTableData();
    });
    realtime.on<Order>(SocketEvents.ORDER_UPDATED, (o) => {
      const idx = myOrders.value.findIndex((x) => x.id === o.id);
      if (idx >= 0) myOrders.value[idx] = o;
      void refreshTableData();
    });
    realtime.on<{ tableSessionId: string }>(SocketEvents.TABLE_SESSION_CLOSED, (payload) => {
      if (payload.tableSessionId === tableSessionId.value) {
        tableClosed.value = true;
        toast.info('La cuenta de la mesa fue cerrada.');
      }
    });
    realtime.on<MusicQueue>(SocketEvents.MUSIC_QUEUE_UPDATED, (q2) => {
      queue.nowPlaying = q2.nowPlaying;
      queue.queue = q2.queue;
    });
    realtime.on<MusicQueue['nowPlaying']>(SocketEvents.MUSIC_PLAYING, (np) => {
      queue.nowPlaying = np;
    });
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
});
</script>
