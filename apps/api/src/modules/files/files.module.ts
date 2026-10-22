import { DynamicModule, Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { isTruthy } from './s3.config';

@Module({})
export class FilesModule {
  /**
   * Routes /files/dev-* uniquement si ENABLE_TEST_HOOKS=true.
   * ensureBuckets reste disponible via service si le module est chargé.
   */
  static register(): DynamicModule {
    const hooks = isTruthy(process.env.ENABLE_TEST_HOOKS);
    return {
      module: FilesModule,
      controllers: hooks ? [FilesController] : [],
      providers: [FilesService],
      exports: [FilesService],
    };
  }
}
