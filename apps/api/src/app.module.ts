import { Module } from "@nestjs/common";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { FilesModule } from "./modules/files/files.module";
import { HealthModule } from "./modules/health/health.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { PrismaModule } from "./modules/prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    CatalogModule,
    FilesModule.register(),
    IdentityModule,
    JobsModule,
  ],
})
export class AppModule {}
