import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  private readonly options: QRCode.QRCodeToBufferOptions = {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 512,
    color: { dark: '#0f0f17', light: '#ffffff' },
  };

  toPngBuffer(content: string): Promise<Buffer> {
    return QRCode.toBuffer(content, { ...this.options, type: 'png' });
  }

  toSvgString(content: string): Promise<string> {
    return QRCode.toString(content, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      color: { dark: '#0f0f17', light: '#ffffff' },
    });
  }

  toDataUrl(content: string): Promise<string> {
    return QRCode.toDataURL(content, this.options as QRCode.QRCodeToDataURLOptions);
  }
}
