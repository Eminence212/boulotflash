import { Controller, Get, HttpCode, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard, type AuthedRequest } from '../identity/auth.guard';
import { SelectionService } from './selection.service';

function idempotencyKey(req: AuthedRequest): string | undefined {
  const header = req.headers['idempotency-key'];
  return Array.isArray(header) ? header[0] : header;
}

/** Sélection (étape 16) : recruteur propriétaire de l’offre, puis candidat destinataire de la proposition. */
@Controller()
@UseGuards(AuthGuard)
export class SelectionController {
  constructor(private readonly selection: SelectionService) {}

  @Get('jobs/:id/applications')
  list(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.selection.listForEmployer(req.userId!, id);
  }

  @Post('applications/:id/shortlist')
  @HttpCode(200)
  shortlist(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.selection.shortlist(req.userId!, id);
  }

  @Post('applications/:id/reject')
  @HttpCode(200)
  reject(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.selection.reject(req.userId!, id);
  }

  @Post('applications/:id/offer')
  async offer(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
  ) {
    const result = await this.selection.offer(req.userId!, id, idempotencyKey(req));
    res.status(result.httpStatus);
    return result.body;
  }

  @Post('selection-offers/:id/accept')
  async accept(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
  ) {
    const result = await this.selection.accept(req.userId!, id, idempotencyKey(req));
    res.status(result.httpStatus);
    return result.body;
  }

  @Post('selection-offers/:id/decline')
  async decline(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
  ) {
    const result = await this.selection.decline(req.userId!, id, idempotencyKey(req));
    res.status(result.httpStatus);
    return result.body;
  }
}
