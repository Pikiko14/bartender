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

    <template v-else-if="needsRegistration">
      <div class="flex min-h-screen flex-col px-5 py-8">
        <header class="mb-8 text-center">
          <h1 class="text-2xl font-extrabold">{{ business?.name }}</h1>
          <p class="mt-1 text-sm text-slate-400">{{ table?.name }}</p>
        </header>

        <div class="card mx-auto w-full max-w-sm p-6">
          <h2 class="text-lg font-bold">Identificación</h2>
          <p class="mt-1 text-sm text-slate-400">
            {{
              registrationStep === 'document'
                ? 'Ingresá tu documento para abrir la cuenta de la mesa.'
                : 'No encontramos tu documento. Ingresá tu nombre para continuar.'
            }}
          </p>
          <p v-if="sessionReopened" class="mt-2 text-xs text-amber-300">
            La cuenta anterior fue cerrada. Completá tus datos para empezar de nuevo.
          </p>

          <form
            v-if="registrationStep === 'document'"
            class="mt-5 space-y-3"
            @submit.prevent="submitDocument"
          >
            <div>
              <label class="text-xs text-slate-500">Documento de identidad *</label>
              <input
                v-model="guestForm.document"
                class="input mt-1 w-full"
                placeholder="Ej. 30123456"
                autocomplete="off"
                inputmode="numeric"
                required
              />
            </div>
            <button
              type="submit"
              class="btn-primary mt-2 w-full"
              :disabled="registering || !canSubmitDocument"
            >
              {{ registering ? 'Verificando…' : 'Continuar' }}
            </button>
          </form>

          <form v-else class="mt-5 space-y-3" @submit.prevent="submitRegistration">
            <div>
              <label class="text-xs text-slate-500">Documento de identidad</label>
              <input
                :value="guestForm.document"
                class="input mt-1 w-full bg-ink-800 text-slate-400"
                readonly
              />
            </div>
            <div>
              <label class="text-xs text-slate-500">Nombre completo *</label>
              <input
                v-model="guestForm.name"
                class="input mt-1 w-full"
                placeholder="Tu nombre"
                autocomplete="name"
                required
                autofocus
              />
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                class="btn-ghost flex-1"
                :disabled="registering"
                @click="backToDocumentStep"
              >
                Volver
              </button>
              <button
                type="submit"
                class="btn-primary flex-1"
                :disabled="registering || !canSubmitName"
              >
                {{ registering ? 'Registrando…' : 'Continuar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>

    <template v-else>
      <!-- Cabecera negocio -->
      <header class="relative overflow-hidden border-b border-ink-700 bg-ink-900/70 px-5 pb-4 pt-6">
        <h1 class="text-2xl font-extrabold">{{ business?.name }}</h1>
        <p class="text-sm text-slate-400">{{ table?.name }} · {{ business?.description }}</p>
        <p v-if="bill.customer" class="mt-1 text-xs text-slate-500">
          {{ bill.customer.name }} · DNI {{ bill.customer.document }}
        </p>
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
        <div
          v-if="menuCategories.length > 1"
          class="sticky top-[49px] z-10 -mx-5 mb-4 flex gap-2 overflow-x-auto border-b border-ink-800 bg-ink-950/95 px-5 pb-3 pt-1 backdrop-blur"
        >
          <button
            type="button"
            class="badge shrink-0 cursor-pointer px-3 py-1.5"
            :class="!menuCategoryFilter ? 'bg-neon-pink text-white' : 'bg-ink-700 text-slate-300'"
            @click="menuCategoryFilter = null"
          >
            Todos
          </button>
          <button
            v-for="cat in menuCategories"
            :key="cat.id"
            type="button"
            class="badge shrink-0 cursor-pointer px-3 py-1.5"
            :class="
              menuCategoryFilter === cat.id ? 'bg-neon-pink text-white' : 'bg-ink-700 text-slate-300'
            "
            @click="menuCategoryFilter = cat.id"
          >
            <span class="mr-1">{{ categoryIcon(cat.type) }}</span>
            {{ cat.name }}
          </button>
        </div>

        <div v-for="cat in filteredMenu" :key="cat.id" class="mb-8">
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
        <p v-if="!filteredMenu.length" class="text-center text-sm text-slate-500">
          No hay productos en esta categoría.
        </p>
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

        <div v-if="youtubeResults.length" class="mt-4 space-y-2">
          <div
            v-for="v in youtubeResults"
            :key="v.youtubeId"
            class="card flex items-center gap-3 p-2"
          >
            <img :src="v.thumbnail" class="h-10 w-16 rounded object-cover" />
            <span class="flex-1 truncate text-sm">{{ v.title }}</span>
            <button class="btn-primary px-3 py-1.5 text-xs" @click="requestYoutube(v)">Pedir</button>
          </div>
        </div>
        <div v-if="spotifyResults.length" class="mt-4 space-y-2">
          <div v-for="t in spotifyResults" :key="t.id" class="card flex items-center gap-3 p-2">
            <img
              :src="t.imageUrl ?? ''"
              class="h-10 w-10 rounded object-cover"
              alt=""
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm">{{ t.title }}</p>
              <p class="truncate text-xs text-slate-500">{{ t.artist }}</p>
            </div>
            <button class="btn-primary px-3 py-1.5 text-xs" @click="requestSpotify(t)">Pedir</button>
          </div>
        </div>

        <h3 v-if="myPending.length" class="mb-2 mt-6 font-semibold text-amber-300">
          Pendientes de aprobación ({{ myPending.length }})
        </h3>
        <div v-if="myPending.length" class="mb-4 space-y-2">
          <div
            v-for="s in myPending"
            :key="s.id"
            class="card flex items-center gap-3 border border-amber-500/30 p-2"
          >
            <img :src="s.thumbnail ?? ''" class="h-10 w-16 rounded object-cover" alt="" />
            <span class="flex-1 truncate text-sm">{{ s.title }}</span>
            <span class="text-xs text-amber-400">Esperando staff</span>
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
import { publicApi, publicSpotifyApi } from '@/services/api';
import { realtime, SocketEvents } from '@/socket/socket';
import { formatMoney } from '@/shared/format';
import { categoryIcon } from '@/shared/menu-icons';
import { ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from '@/shared/order-status';
import { apiErrorMessage } from '@/services/http';
import { setDocumentTitle } from '@/shared/document-title';
import { useToast } from '@/composables/useToast';
import ToastHost from '@/components/ToastHost.vue';
import type { SpotifyTrack } from '@/shared/spotify.types';
import type {
  Business,
  MenuCategory,
  MenuItem,
  MusicQueue,
  MusicRequest,
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
const customerRegistered = ref(false);
const sessionReopened = ref(false);
const needsRegistration = computed(
  () => !customerRegistered.value && !loading.value && !error.value,
);
const guestForm = reactive({ name: '', document: '' });
const registrationStep = ref<'document' | 'name'>('document');
const registering = ref(false);
const canSubmitDocument = computed(() => guestForm.document.trim().length >= 5);
const canSubmitName = computed(() => guestForm.name.trim().length >= 2);
const menu = ref<MenuCategory[]>([]);
const menuCategoryFilter = ref<string | null>(null);

const menuCategories = computed(() =>
  menu.value
    .map((cat) => ({
      ...cat,
      items: (cat.items ?? []).filter((i) => i.available),
    }))
    .filter((cat) => cat.items.length > 0)
    .sort((a, b) => a.order - b.order),
);

const filteredMenu = computed(() => {
  if (!menuCategoryFilter.value) return menuCategories.value;
  return menuCategories.value.filter((c) => c.id === menuCategoryFilter.value);
});

const myOrders = ref<Order[]>([]);
const bill = reactive<TableBill>({
  tableSession: {
    id: '',
    businessId: '',
    tableId: '',
    status: 'open',
    openedAt: '',
    closedAt: null,
    customerId: null,
  },
  tableId: '',
  customer: null,
  orders: [],
  lines: [],
  orderCount: 0,
  total: 0,
  hasActiveSession: false,
});

const cart = reactive<Array<{ item: MenuItem; qty: number }>>([]);
const sending = ref(false);
const cartTotal = computed(() => cart.reduce((acc, l) => acc + l.item.price * l.qty, 0));

const musicQuery = ref('');
const youtubeResults = ref<YoutubeVideo[]>([]);
const spotifyResults = ref<SpotifyTrack[]>([]);
const musicProvider = ref<'YOUTUBE' | 'SPOTIFY' | null>(null);
const isSpotifyMode = computed(
  () => musicProvider.value === 'SPOTIFY' || business.value?.musicProvider === 'SPOTIFY',
);
const queue = reactive<MusicQueue>({ nowPlaying: null, queue: [] });
const myPending = ref<MusicRequest[]>([]);

function trackMyPending(req: MusicRequest) {
  if (req.requestedBy !== sessionId.value || req.status !== 'pending') return;
  if (myPending.value.some((p) => p.id === req.id)) return;
  myPending.value = [...myPending.value, req];
}

function dropMyPending(id: string) {
  myPending.value = myPending.value.filter((p) => p.id !== id);
}

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
    bill.customer = billData.customer ?? null;
    bill.orders = billData.orders;
    bill.lines = billData.lines;
    bill.orderCount = billData.orderCount;
    bill.total = billData.total;
    bill.hasActiveSession = billData.hasActiveSession ?? !!billData.tableSession;
    tableClosed.value = billData.closed === true || billData.tableSession?.status === 'closed';
    tableSessionId.value = billData.tableSession?.id ?? tableSessionId.value;
    if (billData.customer) customerRegistered.value = true;
  }
}

function resetBillState() {
  bill.customer = null;
  bill.orders = [];
  bill.lines = [];
  bill.orderCount = 0;
  bill.total = 0;
  bill.hasActiveSession = false;
  bill.tableSession = {
    id: '',
    businessId: '',
    tableId: '',
    status: 'open',
    openedAt: '',
    closedAt: null,
    customerId: null,
  };
}

async function reopenTableSession() {
  const businessSlug = String(route.params.businessSlug);
  const tableSlug = String(route.params.tableSlug);

  localStorage.removeItem(sessionKey());
  cart.splice(0, cart.length);
  guestForm.name = '';
  guestForm.document = '';
  registrationStep.value = 'document';
  myOrders.value = [];
  resetBillState();
  customerRegistered.value = false;
  tableClosed.value = false;
  sessionReopened.value = true;
  tab.value = 'menu';

  const scan = await publicApi.scan(businessSlug, tableSlug);
  sessionId.value = scan.session.sessionId;
  tableSessionId.value = scan.tableSession.id;
  tableClosed.value = scan.tableSession.status === 'closed';
  customerRegistered.value =
    !scan.requiresCustomerRegistration && (!!scan.customer || !!scan.tableSession.customerId);
  if (scan.customer) bill.customer = scan.customer;
  localStorage.setItem(sessionKey(), sessionId.value);

  if (customerRegistered.value) {
    sessionReopened.value = false;
    await refreshTableData();
  }
}

function backToDocumentStep() {
  registrationStep.value = 'document';
  guestForm.name = '';
}

function applyRegistrationResult(result: {
  status: 'linked' | 'created';
  customer: import('@/shared/types').Customer;
  tableSession: import('@/shared/types').TableSession;
}) {
  bill.customer = result.customer;
  bill.tableSession = result.tableSession;
  tableSessionId.value = result.tableSession.id;
  customerRegistered.value = true;
  sessionReopened.value = false;
  registrationStep.value = 'document';
  guestForm.name = '';
  const msg =
    result.status === 'linked'
      ? `Bienvenido de nuevo, ${result.customer.name}`
      : `Bienvenido, ${result.customer.name}`;
  toast.success(msg);
}

async function submitDocument() {
  if (!canSubmitDocument.value || !sessionId.value) return;
  registering.value = true;
  try {
    const result = await publicApi.registerCustomer({
      sessionId: sessionId.value,
      document: guestForm.document.trim(),
    });
    if (result.status === 'need_name') {
      registrationStep.value = 'name';
      return;
    }
    applyRegistrationResult(result);
    await refreshTableData();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    registering.value = false;
  }
}

async function submitRegistration() {
  if (!canSubmitName.value || !sessionId.value) return;
  registering.value = true;
  try {
    const result = await publicApi.registerCustomer({
      sessionId: sessionId.value,
      document: guestForm.document.trim(),
      name: guestForm.name.trim(),
    });
    if (result.status === 'need_name') {
      registrationStep.value = 'name';
      return;
    }
    applyRegistrationResult(result);
    await refreshTableData();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    registering.value = false;
  }
}

async function submitOrder() {
  if (!customerRegistered.value) {
    toast.error('Registrá tu documento antes de pedir.');
    return;
  }
  if (tableClosed.value) {
    toast.error('La mesa está cerrada. Esperá un momento…');
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
    if (isSpotifyMode.value && business.value?.slug) {
      const conn = await publicSpotifyApi.connection(business.value.slug);
      if (!conn.connected) {
        toast.error(
          'Spotify no está conectado en este local. El dueño debe ir a Configuración → Conectar Spotify.',
        );
        return;
      }
      youtubeResults.value = [];
      spotifyResults.value = await publicSpotifyApi.search(business.value.slug, musicQuery.value);
    } else {
      spotifyResults.value = [];
      youtubeResults.value = await publicApi.searchMusic(musicQuery.value, business.value.slug);
    }
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function requestYoutube(v: YoutubeVideo) {
  try {
    const created = await publicApi.requestSong({
      sessionId: sessionId.value,
      youtubeId: v.youtubeId,
      title: v.title,
      thumbnail: v.thumbnail,
      channelTitle: v.channelTitle,
    });
    trackMyPending(created);
    toast.success('Canción pedida · pendiente de aprobación del staff.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function requestSpotify(t: SpotifyTrack) {
  try {
    const created = await publicSpotifyApi.requestSong({
      sessionId: sessionId.value,
      spotifyId: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      thumbnail: t.imageUrl ?? undefined,
      durationSeconds: t.duration,
    });
    trackMyPending(created);
    toast.success('Canción pedida · pendiente de aprobación del staff.');
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
    customerRegistered.value =
      !scan.requiresCustomerRegistration && (!!scan.customer || !!scan.tableSession.customerId);
    if (scan.customer) bill.customer = scan.customer;
    localStorage.setItem(sessionKey(), sessionId.value);

    menu.value = await publicApi.menu(businessSlug);
    if (customerRegistered.value) {
      await refreshTableData();
    }

    try {
      const conn = await publicSpotifyApi.connection(businessSlug);
      musicProvider.value = conn.musicProvider as 'YOUTUBE' | 'SPOTIFY';
    } catch {
      musicProvider.value = scan.business.musicProvider ?? 'YOUTUBE';
    }

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
      if (payload.tableSessionId !== tableSessionId.value) return;
      toast.info('La cuenta de la mesa fue cerrada.');
      void reopenTableSession().catch((e) => toast.error(apiErrorMessage(e)));
    });
    const applyPublicQueue = (q2: MusicQueue) => {
      queue.nowPlaying = q2.nowPlaying;
      queue.queue = q2.queue;
    };
    realtime.on<MusicQueue>(SocketEvents.MUSIC_QUEUE_UPDATED, applyPublicQueue);
    realtime.on<MusicQueue['nowPlaying']>(SocketEvents.MUSIC_PLAYING, (np) => {
      queue.nowPlaying = np;
    });
    realtime.on<MusicRequest>(SocketEvents.MUSIC_APPROVED, async (req) => {
      dropMyPending(req.id);
      const q2 = await publicApi.publicQueue(businessSlug).catch(() => null);
      if (q2) applyPublicQueue(q2);
    });
    realtime.on<MusicRequest>(SocketEvents.MUSIC_REJECTED, (req) => {
      dropMyPending(req.id);
    });
    realtime.on<MusicRequest>(SocketEvents.MUSIC_REQUESTED, (req) => {
      trackMyPending(req);
    });
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
});
</script>
