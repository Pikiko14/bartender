import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  saveMenuImage(file: Express.Multer.File): { url: string } {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    const ext = ALLOWED_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Formato de imagen no permitido. Usa JPG, PNG, WebP o GIF.');
    }

    const maxSize = this.config.get<number>('uploads.maxFileSize') ?? 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('La imagen supera el tamaño máximo permitido.');
    }

    const menuDir = join(this.resolveUploadDir(), 'menu');
    mkdirSync(menuDir, { recursive: true });

    const filename = `${uuid()}${ext}`;
    writeFileSync(join(menuDir, filename), file.buffer);

    return { url: `/uploads/menu/${filename}` };
  }

  private resolveUploadDir(): string {
    const dir = this.config.get<string>('uploads.dir') ?? 'uploads';
    if (dir.startsWith('/') || /^[A-Za-z]:\\/.test(dir)) return dir;
    return join(process.cwd(), dir);
  }
}
