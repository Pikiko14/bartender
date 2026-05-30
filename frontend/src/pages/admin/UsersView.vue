<template>
  <div>
    <h1 class="text-2xl font-bold">Usuarios</h1>
    <p class="text-sm text-slate-400">Invita a tu equipo y asigna roles.</p>

    <form class="card mt-6 grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-5" @submit.prevent="invite">
      <input v-model="form.name" class="input" placeholder="Nombre" required />
      <input v-model="form.email" type="email" class="input" placeholder="Email" required />
      <input
        v-model="form.password"
        type="password"
        class="input"
        placeholder="Contraseña"
        required
      />
      <select v-model="form.role" class="input">
        <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
      </select>
      <button class="btn-primary text-sm">Invitar</button>
    </form>

    <div class="card mt-6 overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead class="bg-ink-800 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-4 py-3">Nombre</th>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3">Rol</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-t border-ink-700">
            <td class="px-4 py-3 font-medium">{{ u.name }}</td>
            <td class="px-4 py-3 text-slate-400">{{ u.email }}</td>
            <td class="px-4 py-3">
              <span class="badge bg-ink-700 text-slate-300">{{ u.role }}</span>
            </td>
            <td class="px-4 py-3">
              <span
                class="badge"
                :class="
                  (u as any).active === false
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                "
              >
                {{ (u as any).active === false ? 'Inactivo' : 'Activo' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="u.role !== 'OWNER'"
                class="text-red-400 hover:text-red-300"
                @click="remove(u.id)"
              >
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { usersApi } from '@/services/api';
import type { AuthUser, Role } from '@/shared/types';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';

const toast = useToast();
const users = ref<AuthUser[]>([]);
const roles: Role[] = ['ADMIN', 'WAITER', 'DJ', 'CASHIER', 'KITCHEN', 'BAR'];
const form = reactive({ name: '', email: '', password: '', role: 'WAITER' as Role });

async function load() {
  const res = await usersApi.list();
  users.value = res.items;
}

async function invite() {
  try {
    await usersApi.create({ ...form });
    Object.assign(form, { name: '', email: '', password: '', role: 'WAITER' });
    await load();
    toast.success('Usuario invitado.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function remove(id: string) {
  await usersApi.remove(id).catch((e) => toast.error(apiErrorMessage(e)));
  await load();
}

onMounted(() => load().catch((e) => toast.error(apiErrorMessage(e))));
</script>
