import { Body, Controller, HttpCode, HttpException, Post } from '@nestjs/common';
import { ClockService } from './clock.service';
import { SelectionService } from './selection.service';

/** Hooks de test (ENABLE_TEST_HOOKS). Le module ne déclare pas ce contrôleur sans le hook. */
@Controller('test')
export class TestHooksController {
  constructor(
    private readonly clock: ClockService,
    private readonly selection: SelectionService,
  ) {}

  /** `{ "at": "2026-11-01T20:30:00.000Z" }` pose l’heure applicative ; `{ "at": null }` revient à l’heure réelle. */
  @Post('clock')
  @HttpCode(200)
  async setClock(@Body() body: { at?: unknown }) {
    let at: Date | null = null;
    if (body?.at !== null && body?.at !== undefined) {
      at = new Date(String(body.at));
      if (Number.isNaN(at.getTime())) {
        throw new HttpException({ code: 'VALIDATION', message: 'Date invalide.' }, 400);
      }
    }
    const now = await this.clock.set(at);
    return { now: now.toISOString() };
  }

  /** Balayage des propositions échues, à l’heure applicative. */
  @Post('run-expirations')
  @HttpCode(200)
  runExpirations() {
    return this.selection.runExpirations();
  }
}
