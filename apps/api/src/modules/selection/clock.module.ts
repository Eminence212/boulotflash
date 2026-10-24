import { Global, Module } from '@nestjs/common';
import { ClockService } from './clock.service';

/** Une seule horloge applicative pour tous les modules (et une seule connexion Redis de test). */
@Global()
@Module({
  providers: [ClockService],
  exports: [ClockService],
})
export class ClockModule {}
