import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { UploadService } from '../../core/upload/upload.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, UploadService],
  exports: [MediaService, UploadService],
})
export class MediaModule {}
