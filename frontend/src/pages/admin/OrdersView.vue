<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Pedidos</h1>
        <p class="text-sm text-slate-400">Una cuenta por mesa · órdenes consolidadas · cierre y cliente opcional.</p>
      </div>
      <p v-if="view === 'historial' && historyTotal" class="text-lg font-bold text-neon-cyan">
        Total listado: {{ formatMoney(historyTotal) }}
      </p>
    </div>

    <nav class="mt-4 flex flex-wrap gap-2 border-b border-ink-700 pb-3">
      <button
        v-for="t in mainTabs"
        :key="t.id"
        type="button"
        class="badge cursor-pointer px-3 py-1.5"
        :class="view === t.id ? 'bg-neon-pink text-white' : 'bg-ink-700 text-slate-300'"
        @click="view = t.id"
      >
        {{ t.label }}
        <span v-if="t.id === 'curso' && openBills.length" class="ml-1">({{ openBills.length }})</span>
      </button>
    </nav>

    <!-- CUENTAS EN CURSO -->
    <section v-if="view === 'curso'" class="mt-6">
      <p v-if="loadingBills" class="text-sm text-slate-500">Cargando cuentas…</p>
      <p v-else-if="!openBills.length" class="text-sm text-slate-500">
        No hay mesas con pedidos activos. Los clientes deben escanear el QR para abrir una cuenta.
      </p>

      <div v-else class="card overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="bg-ink-800 text-xs uppercase text-slate-500">
            <tr>
              <th class="w-8 px-3 py-3"></th>
              <th class="px-4 py-3">Mesa</th>
              <th class="px-4 py-3">Cliente</th>
              <th class="px-4 py-3">Pedidos</th>
              <th class="px-4 py-3">Resumen</th>
              <th class="px-4 py-3 text-right">Total</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="bill in openBills" :key="billKey(bill)">
              <tr
                class="border-t border-ink-700 hover:bg-ink-900/50"
                :class="expandedKey === billKey(bill) ? 'bg-ink-900/60' : ''"
              >
                <td class="px-3 py-3">
                  <button
                    type="button"
                    class="text-slate-400 hover:text-white"
                    :aria-expanded="expandedKey === billKey(bill)"
                    @click="toggleExpand(bill)"
                  >
                    {{ expandedKey === billKey(bill) ? '▼' : '▶' }}
                  </button>
                </td>
                <td class="px-4 py-3">
                  <p class="font-semibold">{{ tableLabel(bill) }}</p>
                  <p class="text-xs text-slate-500">
                    <span v-if="bill.hasActiveSession">
                      Abierta {{ formatWhen(bill.tableSession?.openedAt) }}
                    </span>
                    <span v-else class="text-amber-400">Sin sesión QR · pedidos sueltos</span>
                  </p>
                </td>
                <td class="px-4 py-3">
                  <p v-if="bill.customer" class="font-medium">{{ bill.customer.name }}</p>
                  <p v-else class="text-slate-500">—</p>
                  <p v-if="bill.customer?.document" class="text-xs text-slate-500">
                    DNI {{ bill.customer.document }}
                  </p>
                  <p v-if="bill.customer?.phone" class="text-xs text-slate-500">{{ bill.customer.phone }}</p>
                  <button
                    type="button"
                    class="mt-1 text-xs text-neon-cyan hover:underline"
                    @click="openCustomerPanel(bill)"
                  >
                    {{ bill.customer ? 'Cambiar' : 'Asociar cliente' }}
                  </button>
                </td>
                <td class="px-4 py-3 text-slate-300">{{ bill.orderCount }}</td>
                <td class="max-w-xs px-4 py-3">
                  <p class="truncate text-slate-400" :title="linesSummary(bill)">
                    {{ linesSummary(bill) || '—' }}
                  </p>
                </td>
                <td class="px-4 py-3 text-right font-bold text-neon-cyan">
                  {{ formatMoney(bill.total) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    v-if="canClose"
                    type="button"
                    class="btn-primary text-xs"
                    :disabled="closingKey === billKey(bill)"
                    @click="closeBill(bill)"
                  >
                    {{ closingKey === billKey(bill) ? 'Cerrando…' : 'Cerrar' }}
                  </button>
                </td>
              </tr>

              <tr v-if="expandedKey === billKey(bill)" class="border-t border-ink-800 bg-ink-950/80">
                <td colspan="7" class="px-4 py-4">
                  <div class="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Consolidado
                      </h4>
                      <ul v-if="bill.lines.length" class="space-y-1 text-sm">
                        <li
                          v-for="line in bill.lines"
                          :key="line.menuItemId"
                          class="flex justify-between gap-2 text-slate-300"
                        >
                          <span>{{ line.quantity }}× {{ line.name }}</span>
                          <span class="text-slate-400">{{ formatMoney(line.subtotal) }}</span>
                        </li>
                      </ul>
                      <p v-else class="text-sm text-slate-500">Sin ítems.</p>
                    </div>
                    <div>
                      <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Órdenes de la mesa
                      </h4>
                      <div class="max-h-64 space-y-2 overflow-y-auto">
                        <div
                          v-for="order in bill.orders"
                          :key="order.id"
                          class="rounded-lg bg-ink-800 p-3 text-sm"
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div>
                              <span class="font-medium">#{{ order.id.slice(-5) }}</span>
                              <span class="ml-2 text-xs text-slate-500">{{ formatWhen(order.createdAt) }}</span>
                            </div>
                            <span class="badge bg-ink-700">{{ ORDER_STATUS_LABEL[order.status] }}</span>
                          </div>
                          <ul class="mt-1 text-slate-400">
                            <li v-for="(it, i) in order.items" :key="i">
                              {{ it.quantity }}× {{ it.name }}
                            </li>
                          </ul>
                          <div class="mt-2 flex items-center justify-between border-t border-ink-700 pt-2">
                            <span class="font-medium">{{ formatMoney(order.total) }}</span>
                            <button
                              v-if="nextStatus(order.status)"
                              type="button"
                              class="btn-primary px-2 py-1 text-xs"
                              @click="advance(order, nextStatus(order.status)!)"
                            >
                              {{ nextStatusLabel(order.status) }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <!-- HISTORIAL -->
    <section v-else-if="view === 'historial'" class="mt-6">
      <p v-if="loadingHistory" class="text-sm text-slate-500">Cargando historial…</p>
      <p v-else-if="!closedBills.length" class="text-sm text-slate-500">Aún no hay cierres registrados.</p>

      <div v-else class="card overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-ink-800 text-xs uppercase text-slate-500">
            <tr>
              <th class="w-8 px-3 py-3"></th>
              <th class="px-4 py-3">Mesa</th>
              <th class="px-4 py-3">Cliente</th>
              <th class="px-4 py-3">Cerrada</th>
              <th class="px-4 py-3">Pedidos</th>
              <th class="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="bill in closedBills" :key="bill.tableSession!.id">
              <tr class="border-t border-ink-700 hover:bg-ink-900/50">
                <td class="px-3 py-3">
                  <button
                    type="button"
                    class="text-slate-400 hover:text-white"
                    @click="toggleExpand(bill)"
                  >
                    {{ expandedKey === billKey(bill) ? '▼' : '▶' }}
                  </button>
                </td>
                <td class="px-4 py-3 font-semibold">{{ tableLabel(bill) }}</td>
                <td class="px-4 py-3">
                  <template v-if="bill.customer">
                    <p>{{ bill.customer.name }}</p>
                    <p class="text-xs text-slate-500">DNI {{ bill.customer.document }}</p>
                  </template>
                  <span v-else>—</span>
                </td>
                <td class="px-4 py-3 text-slate-400">{{ formatWhen(bill.tableSession?.closedAt) }}</td>
                <td class="px-4 py-3">{{ bill.orderCount }}</td>
                <td class="px-4 py-3 text-right font-bold text-neon-cyan">{{ formatMoney(bill.total) }}</td>
              </tr>
              <tr v-if="expandedKey === billKey(bill)" class="border-t border-ink-800 bg-ink-950/80">
                <td colspan="6" class="px-4 py-4">
                  <ul class="grid gap-1 sm:grid-cols-2">
                    <li
                      v-for="line in bill.lines"
                      :key="line.menuItemId"
                      class="flex justify-between gap-2 text-sm text-slate-300"
                    >
                      <span>{{ line.quantity }}× {{ line.name }}</span>
                      <span>{{ formatMoney(line.subtotal) }}</span>
                    </li>
                  </ul>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <!-- LISTADO PLANO -->
    <section v-else class="mt-6">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="f in filters"
          :key="f.value ?? 'all'"
          type="button"
          class="badge cursor-pointer px-3 py-1.5"
          :class="active === f.value ? 'bg-neon-cyan text-ink-950' : 'bg-ink-700 text-slate-300'"
          @click="active = f.value"
        >
          {{ f.label }}
        </button>
      </div>
      <div v-if="filteredFlat.length" class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OrderCard v-for="order in filteredFlat" :key="order.id" :order="order" @advance="advance" />
      </div>
      <p v-else class="mt-4 text-sm text-slate-500">No hay pedidos para este filtro.</p>
    </section>

    <!-- Panel cliente -->
    <div
      v-if="customerPanel"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      @click.self="customerPanel = null"
    >
      <div class="card w-full max-w-md p-5">
        <h3 class="text-lg font-bold">Cliente · {{ tableLabel(customerPanel) }}</h3>
        <p class="mt-1 text-xs text-slate-500">Opcional. Busca uno existente o crea uno nuevo.</p>

        <div class="mt-4">
          <label class="text-xs text-slate-500">Buscar</label>
          <input
            v-model="customerSearch"
            class="input mt-1 w-full"
            placeholder="Nombre, DNI, teléfono o email"
            @input="debouncedSearch"
          />
          <ul v-if="customerResults.length" class="mt-2 max-h-32 overflow-y-auto rounded-lg bg-ink-800">
            <li
              v-for="c in customerResults"
              :key="c.id"
              class="cursor-pointer px-3 py-2 text-sm hover:bg-ink-700"
              @click="selectExistingCustomer(c.id)"
            >
              {{ c.name }}
              <span class="text-slate-500"> · DNI {{ c.document }}</span>
              <span v-if="c.phone" class="text-slate-500"> · {{ c.phone }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-4 border-t border-ink-700 pt-4">
          <p class="text-xs font-semibold uppercase text-slate-500">Crear nuevo</p>
          <div class="mt-2 grid gap-2">
            <input v-model="newCustomer.name" class="input" placeholder="Nombre *" />
            <input v-model="newCustomer.document" class="input" placeholder="Documento de identidad *" />
            <input v-model="newCustomer.phone" class="input" placeholder="Teléfono" />
            <input v-model="newCustomer.email" type="email" class="input" placeholder="Email" />
          </div>
          <button
            type="button"
            class="btn-primary mt-3 w-full text-sm"
            :disabled="!canCreateCustomer || savingCustomer"
            @click="createAndAssignCustomer"
          >
            Crear y asociar
          </button>
        </div>

        <div class="mt-4 flex gap-2">
          <button
            v-if="customerPanel.customer"
            type="button"
            class="btn-ghost flex-1 text-sm text-red-400"
            :disabled="savingCustomer"
            @click="clearCustomer"
          >
            Quitar cliente
          </button>
          <button type="button" class="btn-ghost flex-1 text-sm" @click="customerPanel = null">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import OrderCard from '@/components/OrderCard.vue';
import { customersApi, ordersApi } from '@/services/api';
import { useOrdersStore } from '@/stores/orders.store';
import { useAuthStore } from '@/stores/auth.store';
import { realtime, SocketEvents } from '@/socket/socket';
import { formatMoney } from '@/shared/format';
import { ORDER_STATUS_LABEL, NEXT_STATUS } from '@/shared/order-status';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { Customer, Order, OrderStatus, TableBill } from '@/shared/types';

type MainView = 'curso' | 'historial' | 'todos';

const orders = useOrdersStore();
const auth = useAuthStore();
const toast = useToast();

const view = ref<MainView>('curso');
const openBills = ref<TableBill[]>([]);
const closedBills = ref<TableBill[]>([]);
const loadingBills = ref(false);
const loadingHistory = ref(false);
const closingKey = ref<string | null>(null);
const expandedKey = ref<string | null>(null);
const active = ref<OrderStatus | undefined>(undefined);

const customerPanel = ref<TableBill | null>(null);
const customerSearch = ref('');
const customerResults = ref<Customer[]>([]);
const savingCustomer = ref(false);
const newCustomer = reactive({ name: '', document: '', phone: '', email: '' });
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const mainTabs: Array<{ id: MainView; label: string }> = [
  { id: 'curso', label: 'Cuentas en curso' },
  { id: 'historial', label: 'Historial de ventas' },
  { id: 'todos', label: 'Todos los pedidos' },
];

const filters: Array<{ label: string; value?: OrderStatus }> = [
  { label: 'Todos' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Preparando', value: 'preparing' },
  { label: 'Listos', value: 'ready' },
  { label: 'Entregados', value: 'delivered' },
];

const canClose = computed(() => auth.can('table:close'));

const filteredFlat = computed(() =>
  active.value ? orders.orders.filter((o) => o.status === active.value) : orders.orders,
);

const historyTotal = computed(() => closedBills.value.reduce((acc, b) => acc + b.total, 0));

function billKey(bill: TableBill) {
  return bill.tableSession?.id ?? `table-${bill.tableId}`;
}

function tableLabel(bill: TableBill) {
  return bill.tableName ?? (bill.tableNumber != null ? `Mesa ${bill.tableNumber}` : 'Mesa');
}

function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function linesSummary(bill: TableBill) {
  return bill.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ');
}

function toggleExpand(bill: TableBill) {
  const key = billKey(bill);
  expandedKey.value = expandedKey.value === key ? null : key;
}

function nextStatus(status: OrderStatus) {
  return NEXT_STATUS[status];
}

function nextStatusLabel(status: OrderStatus) {
  const next = NEXT_STATUS[status];
  return next ? ORDER_STATUS_LABEL[next] : '';
}

async function loadOpenBills() {
  loadingBills.value = true;
  try {
    openBills.value = await ordersApi.openTableBills();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    loadingBills.value = false;
  }
}

async function loadClosedBills() {
  loadingHistory.value = true;
  try {
    closedBills.value = await ordersApi.closedTableBills(100);
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    loadingHistory.value = false;
  }
}

async function refreshAll() {
  await Promise.all([
    orders.fetchAll().catch(() => undefined),
    loadOpenBills(),
    loadClosedBills(),
  ]);
}

async function closeBill(bill: TableBill) {
  const label = tableLabel(bill);
  const total = formatMoney(bill.total);
  const ok = window.confirm(
    `¿Cerrar y facturar ${label}?\n\nTotal: ${total}\n\nSe registrará la venta y los clientes deberán identificarse de nuevo.`,
  );
  if (!ok) return;

  const key = billKey(bill);
  closingKey.value = key;
  try {
    let sessionId = bill.tableSession?.id;
    if (!sessionId) {
      const opened = await ordersApi.openTableBill(bill.tableId);
      sessionId = opened.tableSession?.id;
    }
    if (!sessionId) throw new Error('No se pudo abrir la cuenta de mesa.');
    await ordersApi.closeTableBill(sessionId);
    toast.success('Mesa cerrada · venta registrada.');
    if (expandedKey.value === key) expandedKey.value = null;
    await refreshAll();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    closingKey.value = null;
  }
}

async function advance(order: Order, status: OrderStatus) {
  try {
    await orders.updateStatus(order.id, status);
    await loadOpenBills();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

const canCreateCustomer = computed(
  () => newCustomer.name.trim().length >= 2 && newCustomer.document.trim().length >= 5,
);

function openCustomerPanel(bill: TableBill) {
  customerPanel.value = bill;
  customerSearch.value = bill.customer?.document ?? bill.customer?.name ?? '';
  newCustomer.name = '';
  newCustomer.document = '';
  newCustomer.phone = '';
  newCustomer.email = '';
  customerResults.value = [];
  if (customerSearch.value) void searchCustomers();
}

function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void searchCustomers(), 300);
}

async function searchCustomers() {
  try {
    customerResults.value = await customersApi.list(customerSearch.value.trim() || undefined);
  } catch {
    customerResults.value = [];
  }
}

async function assignCustomer(body: {
  tableId: string;
  tableSessionId?: string | null;
  customerId?: string | null;
  create?: { name: string; document: string; phone?: string; email?: string };
}) {
  if (!customerPanel.value) return;
  savingCustomer.value = true;
  try {
    const updated = await ordersApi.assignTableCustomer(body);
    replaceBill(updated);
    toast.success('Cliente asociado.');
    customerPanel.value = null;
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    savingCustomer.value = false;
  }
}

function replaceBill(updated: TableBill) {
  const key = billKey(updated);
  const idx = openBills.value.findIndex((b) => billKey(b) === key || b.tableId === updated.tableId);
  if (idx >= 0) openBills.value[idx] = updated;
}

async function selectExistingCustomer(customerId: string) {
  if (!customerPanel.value) return;
  await assignCustomer({
    tableId: customerPanel.value.tableId,
    tableSessionId: customerPanel.value.tableSession?.id ?? null,
    customerId,
  });
}

async function createAndAssignCustomer() {
  if (!customerPanel.value || !canCreateCustomer.value) return;
  await assignCustomer({
    tableId: customerPanel.value.tableId,
    tableSessionId: customerPanel.value.tableSession?.id ?? null,
    create: {
      name: newCustomer.name.trim(),
      document: newCustomer.document.trim(),
      phone: newCustomer.phone.trim() || undefined,
      email: newCustomer.email.trim() || undefined,
    },
  });
}

async function clearCustomer() {
  if (!customerPanel.value) return;
  await assignCustomer({
    tableId: customerPanel.value.tableId,
    tableSessionId: customerPanel.value.tableSession?.id ?? null,
    customerId: null,
  });
}

function onTableClosed() {
  void refreshAll();
}

function onOrderChange() {
  void loadOpenBills();
}

onMounted(async () => {
  if (auth.user?.businessId) {
    orders.bindBusiness(auth.user.businessId);
    realtime.on(SocketEvents.TABLE_SESSION_CLOSED, onTableClosed);
    realtime.on(SocketEvents.ORDER_CREATED, onOrderChange);
    realtime.on(SocketEvents.ORDER_UPDATED, onOrderChange);
  }
  await refreshAll();
});

onBeforeUnmount(() => {
  realtime.off(SocketEvents.TABLE_SESSION_CLOSED, onTableClosed);
  realtime.off(SocketEvents.ORDER_CREATED, onOrderChange);
  realtime.off(SocketEvents.ORDER_UPDATED, onOrderChange);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>
