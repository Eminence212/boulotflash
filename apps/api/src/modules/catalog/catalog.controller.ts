import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

function wantsActive(active: string | undefined): boolean {
  return active === '1' || active === 'true';
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories(@Query('active') active?: string) {
    return this.catalog.listCategories(wantsActive(active));
  }

  @Get('communes')
  communes(@Query('active') active?: string) {
    return this.catalog.listCommunes(wantsActive(active));
  }
}
