import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { Permission } from '@shared/enums';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('menu')
  @RequirePermissions(Permission.MENU_MANAGE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadMenuImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('businessId') _businessId: string,
  ) {
    return this.uploads.saveMenuImage(file);
  }
}
