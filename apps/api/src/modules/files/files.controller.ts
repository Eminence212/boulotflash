import { Body, Controller, Post } from '@nestjs/common';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('dev-presign')
  devPresign(
    @Body() body: { bucket?: string; contentType?: string },
  ): Promise<{ uploadUrl: string; key: string }> {
    return this.files.createUploadPresign({
      bucket: body.bucket ?? '',
      contentType: body.contentType ?? '',
    });
  }

  @Post('dev-complete')
  devComplete(
    @Body() body: { bucket?: string; key?: string },
  ): Promise<{ bucket: string; key: string; byteSize: number }> {
    return this.files.completeUpload({
      bucket: body.bucket ?? '',
      key: body.key ?? '',
    });
  }

  @Post('dev-download-url')
  devDownloadUrl(
    @Body() body: { bucket?: string; key?: string; expiresIn?: number },
  ): Promise<{ downloadUrl: string }> {
    return this.files.createDownloadUrl({
      bucket: body.bucket ?? '',
      key: body.key ?? '',
      expiresIn: body.expiresIn,
    });
  }
}
