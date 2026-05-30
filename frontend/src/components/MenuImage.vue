<template>
  <div
    class="relative shrink-0 overflow-hidden bg-ink-800"
    :class="sizeClass"
  >
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      loading="lazy"
      @error="failed = true"
    />
    <div
      v-else
      class="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-800 text-slate-500"
    >
      <span :class="iconClass">{{ fallbackIcon }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt?: string;
    size?: 'thumb' | 'card' | 'banner';
    fallbackIcon?: string;
  }>(),
  {
    alt: '',
    size: 'card',
    fallbackIcon: '🍽️',
  },
);

const failed = ref(false);

watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);

const sizeClass = computed(() => {
  switch (props.size) {
    case 'thumb':
      return 'h-12 w-12 rounded-lg';
    case 'banner':
      return 'h-36 w-full rounded-xl';
    case 'card':
    default:
      return 'h-20 w-20 rounded-xl';
  }
});

const iconClass = computed(() => (props.size === 'banner' ? 'text-4xl' : 'text-2xl'));
</script>
