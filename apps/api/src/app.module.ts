import { Module } from "@nestjs/common";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { FilesModule } from "./modules/files/files.module";
import { HealthModule } from "./modules/health/health.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ClockModule } from "./modules/selection/clock.module";
import { SelectionModule } from "./modules/selection/selection.module";

@Module({
  imports: [
    PrismaModule,
    ClockModule,
    HealthModule,
    CatalogModule,
    FilesModule.register(),
    IdentityModule,
    JobsModule,
    SelectionModule.register(),
  ],
})
export class AppModule {}
