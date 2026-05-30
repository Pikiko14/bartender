import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsModule } from '@modules/subscriptions/subscriptions.module';
import { UserPermissionsService } from './domain/services/user-permissions.service';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { UsersController } from './infrastructure/controllers/users.controller';
import { UserMongoRepository } from './infrastructure/repositories/user.mongo.repository';
import { UserModel, UserSchema } from './infrastructure/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }]),
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [UsersController],
  providers: [
    UserPermissionsService,
    CreateUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
  ],
  exports: [USER_REPOSITORY, UserPermissionsService],
})
export class UsersModule {}
