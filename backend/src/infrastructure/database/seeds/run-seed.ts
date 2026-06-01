import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { v4 as uuid } from 'uuid';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../app.module';
import { MenuCategoryType, PreparationArea, Role } from '@shared/enums';
import { MusicProvider } from '@shared/enums/music-provider.enum';
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

/** Email marcador del seed demo — si existe, no se vuelve a cargar. */
export const SEED_OWNER_EMAIL = 'owner@bartender.app';

export async function runSeed(logger = new Logger('Seed')): Promise<void> {
  if (!process.env.MONGO_URI) {
    logger.warn('MONGO_URI no definida — seed omitido');
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const users = app.get<UserRepository>(USER_REPOSITORY);
    const businesses = app.get<BusinessRepository>(BUSINESS_REPOSITORY);
    const tables = app.get<TableRepository>(TABLE_REPOSITORY);
    const categories = app.get<MenuCategoryRepository>(MENU_CATEGORY_REPOSITORY);
    const items = app.get<MenuItemRepository>(MENU_ITEM_REPOSITORY);
    const passwords = app.get(PasswordService);
    const config = app.get(ConfigService);
    const qrBase = config.get<string>('qr.baseUrl');

    await seedPlans(app);

    if (await users.findByEmail(SEED_OWNER_EMAIL)) {
      logger.log('Datos demo ya presentes — seed de ejemplo omitido (planes sincronizados)');
      return;
    }

    const hash = await passwords.hash('Password123!');

    let owner = await users.create(
      new User({
        id: uuid(),
        name: 'Marcos Owner',
        email: SEED_OWNER_EMAIL,
        passwordHash: hash,
        role: Role.OWNER,
        businessId: null,
        active: true,
        extraPermissions: [],
        revokedPermissions: [],
      }),
    );

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
        musicProvider: MusicProvider.YOUTUBE,
        spotifyUserId: null,
        spotifyDisplayName: null,
        spotifyAccessToken: null,
        spotifyRefreshToken: null,
        spotifyTokenExpiresAt: null,
        spotifyDeviceId: null,
        spotifyConnectedAt: null,
        spotifyLastSyncAt: null,
      }),
    );
    const businessId = business.id;

    owner.assignBusiness(businessId);
    owner = await users.update(owner);

    await app.get(ChangePlanUseCase).assignTrial(businessId);

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

    const catData: Array<[string, MenuCategoryType]> = [
      ['Cócteles', MenuCategoryType.BEBIDAS],
      ['Cervezas', MenuCategoryType.BEBIDAS],
      ['Para picar', MenuCategoryType.COMIDA],
      ['Postres', MenuCategoryType.POSTRES],
    ];
    const catIds: Record<string, string> = {};
    let order = 0;
    for (const [name, type] of catData) {
      const cat = await categories.create(
        new MenuCategory({ id: uuid(), businessId, name, type, order: order++, active: true, image: null }),
      );
      catIds[name] = cat.id;
    }

    const itemData: Array<[string, string, number, PreparationArea, string]> = [
      ['Mojito', 'Cócteles', 35000, PreparationArea.BAR, 'Ron, lima, menta y soda.'],
      ['Negroni', 'Cócteles', 38000, PreparationArea.BAR, 'Gin, Campari y vermut rojo.'],
      ['Gin Tonic Premium', 'Cócteles', 42000, PreparationArea.BAR, 'Gin premium y tónica artesanal.'],
      ['IPA Artesanal', 'Cervezas', 18000, PreparationArea.BAR, 'Cerveza IPA local de barril.'],
      ['Rubia 33cl', 'Cervezas', 12000, PreparationArea.BAR, 'Cerveza rubia bien fría.'],
      ['Patatas Bravas', 'Para picar', 25000, PreparationArea.KITCHEN, 'Con salsa brava y alioli.'],
      ['Croquetas de Jamón', 'Para picar', 28000, PreparationArea.KITCHEN, 'Seis unidades caseras.'],
      ['Burger Bartender', 'Para picar', 45000, PreparationArea.KITCHEN, 'Doble carne, cheddar y bacon.'],
      ['Coulant de Chocolate', 'Postres', 22000, PreparationArea.KITCHEN, 'Con helado de vainilla.'],
      ['Tarta de Queso', 'Postres', 20000, PreparationArea.KITCHEN, 'Estilo horno, cremosa.'],
    ];
    for (const [name, catName, price, area, description] of itemData) {
      await items.create(
        new MenuItem({
          id: uuid(),
          businessId,
          categoryId: catIds[catName],
          name,
          description,
          price,
          image: null,
          stock: null,
          available: true,
          preparationArea: area,
        }),
      );
    }

    logger.log('✅ Seed demo completado');
    logger.log(`   Negocio: ${slug}`);
    logger.log(`   Login OWNER -> ${SEED_OWNER_EMAIL} / Password123!`);
  } finally {
    await app.close();
  }
}
