<template>
  <div class="flex min-h-screen items-center justify-center px-6">
    <div class="card w-full max-w-md p-8">
      <RouterLink to="/" class="text-2xl font-extrabold text-neon-pink">Bartender</RouterLink>
      <h1 class="mt-6 text-2xl font-bold">Inicia sesión</h1>
      <p class="mt-1 text-sm text-slate-400">Accede al panel de tu negocio.</p>

      <form class="mt-8 space-y-4" @submit.prevent="submit">
        <div>
          <label class="label">Email</label>
          <input
            v-model="email"
            type="email"
            class="input"
            placeholder="owner@bartender.app"
            required
          />
        </div>
        <div>
          <label class="label">Contraseña</label>
          <input v-model="password" type="password" class="input" placeholder="••••••••" required />
        </div>
        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
        <button class="btn-primary w-full" :disabled="auth.loading">
          {{ auth.loading ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-400">
        ¿No tienes cuenta?
        <RouterLink to="/register" class="text-neon-cyan">Regístrate</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/services/http';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('owner@bartender.app');
const password = ref('Password123!');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    await auth.login(email.value, password.value);
    const redirect = (route.query.redirect as string) || '/app/dashboard';
    router.push(redirect);
  } catch (e) {
    error.value = apiErrorMessage(e);
  }
}
</script>
