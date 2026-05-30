<template>
  <div class="flex flex-wrap items-center gap-2">
    <MenuImage
      v-if="modelValue || previewUrl"
      :src="previewUrl ?? modelValue"
      :alt="alt"
      size="thumb"
      :fallback-icon="fallbackIcon"
    />
    <label class="btn-ghost cursor-pointer text-xs">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="hidden"
        :disabled="uploading"
        @change="onFileSelected"
      />
      {{ uploading ? 'Subiendo…' : modelValue || previewUrl ? 'Cambiar' : 'Subir imagen' }}
    </label>
    <button
      v-if="modelValue || previewUrl"
      type="button"
      class="text-xs text-red-400 hover:text-red-300"
      :disabled="uploading"
      @click="clearImage"
    >
      Quitar
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MenuImage from '@/components/MenuImage.vue';
import { uploadsApi } from '@/services/api';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    alt?: string;
    fallbackIcon?: string;
  }>(),
  {
    modelValue: null,
    alt: '',
    fallbackIcon: '🍽️',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const toast = useToast();
const uploading = ref(false);
const previewUrl = ref<string | null>(null);

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toast.error('La imagen no puede superar 5 MB.');
    return;
  }

  uploading.value = true;
  previewUrl.value = URL.createObjectURL(file);
  try {
    const { url } = await uploadsApi.menuImage(file);
    emit('update:modelValue', url);
    previewUrl.value = null;
  } catch (e) {
    previewUrl.value = null;
    toast.error(apiErrorMessage(e));
  } finally {
    uploading.value = false;
  }
}

function clearImage() {
  previewUrl.value = null;
  emit('update:modelValue', null);
}
</script>
