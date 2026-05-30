import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './stores/auth.store';
import { setDocumentTitle } from './shared/document-title';
import './assets/main.css';

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());

  // Restaura la sesión antes de montar el router (para guards).
  const auth = useAuthStore();
  await auth.restoreSession();

  app.use(router);
  await router.isReady();

  const title = router.currentRoute.value.meta.title;
  setDocumentTitle(typeof title === 'string' ? title : undefined);

  app.mount('#app');
}

void bootstrap();
