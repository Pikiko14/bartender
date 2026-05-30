<template>
  <div class="flex min-h-screen items-center justify-center px-6">
    <div class="card w-full max-w-md p-8">
      <RouterLink to="/" class="text-2xl font-extrabold text-neon-pink">Bartender</RouterLink>
      <h1 class="mt-6 text-2xl font-bold">Crea tu cuenta</h1>
      <p class="mt-1 text-sm text-slate-400">Serás el OWNER y podrás crear tu negocio.</p>

      <form class="mt-8 space-y-4" @submit.prevent="submit">
        <div>
          <label class="label">Nombre</label>
          <input v-model="name" class="input" placeholder="Tu nombre" required />
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="email" type="email" class="input" required />
        </div>
        <div>
          <label class="label">Contraseña</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="Mínimo 8 caracteres"
            required
          />
        </div>
        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
        <button class="btn-primary w-full" :disabled="auth.loading">
          {{ auth.loading ? 'Creando…' : 'Crear cuenta' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?
        <RouterLink to="/login" class="text-neon-cyan">Inicia sesión</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/services/http';

const auth = useAuthStore();
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    await auth.register(name.value, email.value, password.value);
    router.push('/app/dashboard');
  } catch (e) {
    error.value = apiErrorMessage(e);
  }
}
</script>
