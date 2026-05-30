/* eslint-disable no-console */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { v4 as uuid } from 'uuid';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../app.module';
import { MenuCategoryType, PreparationArea, Role } from '@shared/enums';
import { slugify } from '@shared/utils/slug.util';
import { PasswordService } from '@infrastructure/security/password.service';
import { User } from '@modules/users/domain/entities/user.entity';
import {
  USER_REPOSITORY,
  UserRepository,
} from '@modules/users/domain/repositories/user.repository';
import { Business, SubscriptionStatus } from '@modules/business/domain/entities/business.entity';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '@modules/business/domain/repositories/business.repository';
import { Table } from '@modules/tables/domain/entities/table.entity';
import {
  TABLE_REPOSITORY,
  TableRepository,
} from '@modules/tables/domain/repositories/table.repository';
import { MenuCategory } from '@modules/menu/domain/entities/menu-category.entity';
import { MenuItem } from '@modules/menu/domain/entities/menu-item.entity';
import {
  MENU_CATEGORY_REPOSITORY,
  MENU_ITEM_REPOSITORY,
  MenuCategoryRepository,
  MenuItemRepository,
} from '@modules/menu/domain/repositories/menu.repository';
import { seedPlans } from '@modules/subscriptions/infrastructure/database/seed-plans';
import { ChangePlanUseCase } from '@modules/subscriptions/application/use-cases/change-plan.use-case';

async function run(): Promise<void> {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  const users = app.get<UserRepository>(USER_REPOSITORY);
  const businesses = app.get<BusinessRepository>(BUSINESS_REPOSITORY);
  const tables = app.get<TableRepository>(TABLE_REPOSITORY);
  const categories = app.get<MenuCategoryRepository>(MENU_CATEGORY_REPOSITORY);
  const items = app.get<MenuItemRepository>(MENU_ITEM_REPOSITORY);
  const passwords = app.get(PasswordService);
  const config = app.get(ConfigService);
  const qrBase = config.get<string>('qr.baseUrl');

  const ownerEmail = 'owner@bartender.app';

  await seedPlans(app);

  if (await users.findByEmail(ownerEmail)) {
    logger.warn('La base ya contiene datos de ejemplo. Seed omitido.');
    await app.close();
    return;
  }

  const hash = await passwords.hash('Password123!');

  // --- OWNER (sin negocio todavía) ---
  let owner = await users.create(
    new User({
      id: uuid(),
      name: 'Marcos Owner',
      email: ownerEmail,
      passwordHash: hash,
      role: Role.OWNER,
      businessId: null,
      active: true,
      extraPermissions: [],
      revokedPermissions: [],
    }),
  );

  // --- Negocio (ownerId real) ---
  const slug = 'la-esquina';
  const business = await businesses.create(
    new Business({
      id: uuid(),
      name: 'La Esquina',
      slug,
      logo: null,
      cover: null,
      description: 'Gastrobar de cócteles de autor y cocina de mercado.',
      ownerId: owner.id,
      active: true,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    }),
  );
  const businessId = business.id;

  // Asocia el owner a su negocio.
  owner.assignBusiness(businessId);
  owner = await users.update(owner);

  await app.get(ChangePlanUseCase).assignTrial(businessId);

  // --- Staff ---
  const staff: Array<[string, string, Role]> = [
    ['Camarero Demo', 'waiter@bartender.app', Role.WAITER],
    ['Cocina Demo', 'kitchen@bartender.app', Role.KITCHEN],
    ['Barra Demo', 'bar@bartender.app', Role.BAR],
    ['DJ Demo', 'dj@bartender.app', Role.DJ],
  ];
  for (const [name, email, role] of staff) {
    await users.create(
      new User({
        id: uuid(),
        name,
        email,
        passwordHash: hash,
        role,
        businessId,
        active: true,
        extraPermissions: [],
        revokedPermissions: [],
      }),
    );
  }

  // --- Mesas ---
  for (let n = 1; n <= 8; n++) {
    const name = `Mesa ${n}`;
    const tableSlug = slugify(name);
    await tables.create(
      new Table({
        id: uuid(),
        businessId,
        number: n,
        name,
        slug: tableSlug,
        qrUrl: `${qrBase}/b/${slug}/table/${tableSlug}`,
        active: true,
      }),
    );
  }

  // --- Menú ---
  const catData: Array<[string, MenuCategoryType, string]> = [
    ['Cócteles', MenuCategoryType.BEBIDAS, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7b88?w=800&q=80'],
    ['Cervezas', MenuCategoryType.BEBIDAS, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&q=80'],
    ['Para picar', MenuCategoryType.COMIDA, 'https://images.unsplash.com/photo-1550547660-9459482d5a67?w=800&q=80'],
    ['Postres', MenuCategoryType.POSTRES, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80'],
  ];
  const catIds: Record<string, string> = {};
  let order = 0;
  for (const [name, type, image] of catData) {
    const cat = await categories.create(
      new MenuCategory({ id: uuid(), businessId, name, type, order: order++, active: true, image }),
    );
    catIds[name] = cat.id;
  }

  const itemData: Array<[string, string, number, PreparationArea, string, string]> = [
    ['Mojito', 'Cócteles', 8.5, PreparationArea.BAR, 'Ron, lima, menta y soda.', 'https://images.unsplash.com/photo-1551538827-9c037cb70832?w=400&q=80'],
    ['Negroni', 'Cócteles', 9.0, PreparationArea.BAR, 'Gin, Campari y vermut rojo.', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7b88?w=400&q=80'],
    ['Gin Tonic Premium', 'Cócteles', 10.0, PreparationArea.BAR, 'Gin premium y tónica artesanal.', 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80'],
    ['IPA Artesanal', 'Cervezas', 5.0, PreparationArea.BAR, 'Cerveza IPA local de barril.', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=80'],
    ['Rubia 33cl', 'Cervezas', 3.5, PreparationArea.BAR, 'Cerveza rubia bien fría.', 'https://images.unsplash.com/photo-1434644573012-3ceab86a3b48?w=400&q=80'],
    ['Patatas Bravas', 'Para picar', 6.5, PreparationArea.KITCHEN, 'Con salsa brava y alioli.', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80'],
    ['Croquetas de Jamón', 'Para picar', 7.0, PreparationArea.KITCHEN, 'Seis unidades caseras.', 'https://images.unsplash.com/photo-1601050690597-df0568f70946?w=400&q=80'],
    ['Burger Bartender', 'Para picar', 11.5, PreparationArea.KITCHEN, 'Doble carne, cheddar y bacon.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80'],
    ['Coulant de Chocolate', 'Postres', 6.0, PreparationArea.KITCHEN, 'Con helado de vainilla.', 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&q=80'],
    ['Tarta de Queso', 'Postres', 5.5, PreparationArea.KITCHEN, 'Estilo horno, cremosa.', 'https://images.unsplash.com/photo-1524351199678-941a58a4df10?w=400&q=80'],
  ];
  for (const [name, catName, price, area, description, image] of itemData) {
    await items.create(
      new MenuItem({
        id: uuid(),
        businessId,
        categoryId: catIds[catName],
        name,
        description,
        price,
        image,
        stock: null,
        available: true,
        preparationArea: area,
      }),
    );
  }

  logger.log('✅ Seed completado.');
  logger.log(`   Negocio: ${slug}`);
  logger.log('   Login OWNER -> owner@bartender.app / Password123!');
  logger.log('   Staff -> waiter|kitchen|bar|dj @bartender.app / Password123!');
  await app.close();
}

run().catch((err) => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
