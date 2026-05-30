<template>
  <div
    class="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center"
  >
    <span class="badge mb-6 bg-neon-pink/15 text-neon-pink">SaaS para bares & discotecas</span>
    <h1
      class="bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text text-5xl font-extrabold text-transparent sm:text-7xl"
    >
      Bartender
    </h1>
    <p class="mt-6 max-w-2xl text-lg text-slate-400">
      Carta digital por QR, comandas en tiempo real para cocina y barra, y peticiones de música
      estilo Spotify social. Todo en una plataforma rápida y moderna.
    </p>

    <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
      <RouterLink to="/login" class="btn-primary">Acceder al panel</RouterLink>
      <RouterLink to="/register" class="btn-ghost">Crear cuenta</RouterLink>
      <RouterLink to="/pricing" class="btn-ghost">Ver planes</RouterLink>
    </div>

    <div class="mt-16 grid w-full gap-4 sm:grid-cols-3">
      <div v-for="f in features" :key="f.title" class="card p-6 text-left">
        <div class="text-2xl">{{ f.icon }}</div>
        <h3 class="mt-3 font-semibold text-slate-100">{{ f.title }}</h3>
        <p class="mt-1 text-sm text-slate-400">{{ f.desc }}</p>
      </div>
    </div>

    <p class="mt-12 text-xs text-slate-600">
      Demo cliente (QR): <code class="text-neon-cyan">/b/la-esquina/table/mesa-1</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

const features = [
  { icon: '📱', title: 'Pedidos por QR', desc: 'Sin apps ni login: escanea y pide desde la mesa.' },
  { icon: '🍳', title: 'KDS + Barra', desc: 'Comandas separadas automáticamente en tiempo real.' },
  { icon: '🎵', title: 'Música social', desc: 'Clientes piden, el staff aprueba y reproduce.' },
];
</script>
