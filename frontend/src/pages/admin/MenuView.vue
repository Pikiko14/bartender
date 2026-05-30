<template>
  <div>
    <h1 class="text-2xl font-bold">Menú</h1>
    <p class="text-sm text-slate-400">Gestiona categorías y productos con imágenes (cocina / barra).</p>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- Categorías -->
      <div class="card p-5">
        <h2 class="font-semibold">Categorías</h2>
        <form class="mt-4 space-y-2" @submit.prevent="addCategory">
          <input v-model="catForm.name" class="input" placeholder="Nombre" required />
          <select v-model="catForm.type" class="input">
            <option value="bebidas">Bebidas</option>
            <option value="comida">Comida</option>
            <option value="postres">Postres</option>
            <option value="promociones">Promociones</option>
          </select>
          <ImageUpload
            v-model="catForm.image"
            :fallback-icon="categoryIcon(catForm.type)"
            alt="Imagen categoría"
          />
          <button class="btn-primary w-full text-sm">Añadir categoría</button>
        </form>
        <ul class="mt-4 space-y-2">
          <li
            v-for="c in menu.categories"
            :key="c.id"
            class="rounded-lg bg-ink-800 px-3 py-2 text-sm"
          >
            <div class="flex items-center gap-3">
              <MenuImage
                :src="c.image"
                :alt="c.name"
                size="thumb"
                :fallback-icon="categoryIcon(c.type)"
              />
              <div class="min-w-0 flex-1">
                <span class="font-medium">{{ c.name }}</span>
                <span class="text-xs text-slate-500"> · {{ c.type }}</span>
              </div>
              <button class="text-red-400 hover:text-red-300" @click="removeCategory(c.id)">
                ✕
              </button>
            </div>
            <div class="mt-2">
              <ImageUpload
                :model-value="c.image"
                :fallback-icon="categoryIcon(c.type)"
                :alt="c.name"
                @update:model-value="updateCategoryImage(c.id, $event)"
              />
            </div>
          </li>
        </ul>
      </div>

      <!-- Productos -->
      <div class="card p-5 lg:col-span-2">
        <h2 class="font-semibold">Productos</h2>
        <form class="mt-4 grid gap-2 sm:grid-cols-2" @submit.prevent="addItem">
          <input v-model="itemForm.name" class="input" placeholder="Nombre" required />
          <input
            v-model.number="itemForm.price"
            type="number"
            step="0.01"
            min="0"
            class="input"
            placeholder="Precio (COP)"
            required
          />
          <select v-model="itemForm.categoryId" class="input" required>
            <option value="" disabled>Categoría…</option>
            <option v-for="c in menu.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <select v-model="itemForm.preparationArea" class="input">
            <option value="KITCHEN">Cocina</option>
            <option value="BAR">Barra</option>
          </select>
          <div class="sm:col-span-2">
            <ImageUpload v-model="itemForm.image" :alt="itemForm.name || 'Producto'" />
          </div>
          <input
            v-model="itemForm.description"
            class="input sm:col-span-2"
            placeholder="Descripción (opcional)"
          />
          <button class="btn-primary text-sm sm:col-span-2">Añadir producto</button>
        </form>

        <div class="mt-5 space-y-2">
          <div
            v-for="it in menu.items"
            :key="it.id"
            class="rounded-lg bg-ink-800 px-3 py-2.5 text-sm"
          >
            <div class="flex items-center gap-3">
              <MenuImage :src="it.image" :alt="it.name" size="thumb" />
              <div class="min-w-0 flex-1">
                <span class="font-medium">{{ it.name }}</span>
                <span
                  class="ml-2 badge"
                  :class="
                    it.preparationArea === 'BAR'
                      ? 'bg-neon-cyan/20 text-neon-cyan'
                      : 'bg-neon-amber/20 text-amber-300'
                  "
                >
                  {{ it.preparationArea === 'BAR' ? 'Barra' : 'Cocina' }}
                </span>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <button
                  class="text-xs text-slate-400 hover:text-slate-200"
                  @click="toggle(it.id, !it.available)"
                >
                  {{ it.available ? 'Disponible' : 'Agotado' }}
                </button>
                <span class="text-slate-400">{{ formatMoney(it.price) }}</span>
                <button
                  class="btn-ghost px-2 py-1 text-xs"
                  @click="startEditItem(it)"
                >
                  Editar
                </button>
                <button class="text-red-400 hover:text-red-300" @click="menu.removeItem(it.id)">
                  ✕
                </button>
              </div>
            </div>

            <form
              v-if="editingItemId === it.id"
              class="mt-3 grid gap-2 border-t border-ink-700 pt-3 sm:grid-cols-2"
              @submit.prevent="saveEditItem"
            >
              <input v-model="editForm.name" class="input" placeholder="Nombre" required />
              <input
                v-model.number="editForm.price"
                type="number"
                step="0.01"
                min="0"
                class="input"
                placeholder="Precio (COP)"
                required
              />
              <select v-model="editForm.categoryId" class="input" required>
                <option v-for="c in menu.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <select v-model="editForm.preparationArea" class="input">
                <option value="KITCHEN">Cocina</option>
                <option value="BAR">Barra</option>
              </select>
              <input
                v-model="editForm.description"
                class="input sm:col-span-2"
                placeholder="Descripción (opcional)"
              />
              <div class="sm:col-span-2">
                <ImageUpload v-model="editForm.image" :alt="editForm.name || 'Producto'" />
              </div>
              <div class="flex gap-2 sm:col-span-2">
                <button type="submit" class="btn-primary text-sm">Guardar</button>
                <button type="button" class="btn-ghost text-sm" @click="cancelEditItem">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import ImageUpload from '@/components/ImageUpload.vue';
import MenuImage from '@/components/MenuImage.vue';
import { useMenuStore } from '@/stores/menu.store';
import { formatMoney } from '@/shared/format';
import { categoryIcon } from '@/shared/menu-icons';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { MenuItem } from '@/shared/types';

const menu = useMenuStore();
const toast = useToast();

const catForm = reactive({ name: '', type: 'bebidas', image: null as string | null });
const itemForm = reactive({
  name: '',
  price: 0,
  categoryId: '',
  preparationArea: 'BAR' as 'BAR' | 'KITCHEN',
  description: '',
  image: null as string | null,
});

const editingItemId = ref<string | null>(null);
const editForm = reactive({
  name: '',
  price: 0,
  categoryId: '',
  preparationArea: 'BAR' as 'BAR' | 'KITCHEN',
  description: '',
  image: null as string | null,
});

function startEditItem(item: MenuItem) {
  editingItemId.value = item.id;
  editForm.name = item.name;
  editForm.price = item.price;
  editForm.categoryId = item.categoryId;
  editForm.preparationArea = item.preparationArea;
  editForm.description = item.description ?? '';
  editForm.image = item.image;
}

function cancelEditItem() {
  editingItemId.value = null;
}

async function saveEditItem() {
  if (!editingItemId.value) return;
  try {
    await menu.updateItem(editingItemId.value, {
      name: editForm.name,
      price: editForm.price,
      categoryId: editForm.categoryId,
      preparationArea: editForm.preparationArea,
      description: editForm.description || undefined,
      image: editForm.image,
    });
    editingItemId.value = null;
    toast.success('Producto actualizado.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function addCategory() {
  try {
    await menu.createCategory({
      name: catForm.name,
      type: catForm.type,
      image: catForm.image || undefined,
    });
    catForm.name = '';
    catForm.image = null;
    toast.success('Categoría creada.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function updateCategoryImage(id: string, image: string | null) {
  try {
    await menu.updateCategory(id, { image });
    toast.success('Imagen de categoría actualizada.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function removeCategory(id: string) {
  await menu.removeCategory(id).catch((e) => toast.error(apiErrorMessage(e)));
}

async function addItem() {
  try {
    await menu.createItem({
      name: itemForm.name,
      price: itemForm.price,
      categoryId: itemForm.categoryId,
      preparationArea: itemForm.preparationArea,
      description: itemForm.description || undefined,
      image: itemForm.image || undefined,
    });
    itemForm.name = '';
    itemForm.price = 0;
    itemForm.description = '';
    itemForm.image = null;
    toast.success('Producto creado.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function toggle(id: string, available: boolean) {
  await menu.updateItem(id, { available }).catch((e) => toast.error(apiErrorMessage(e)));
}

onMounted(() => menu.fetchAll().catch((e) => toast.error(apiErrorMessage(e))));
</script>
