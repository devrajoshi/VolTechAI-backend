import { Module } from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";
import { AdminCatalogueController } from "./admin-catalogue.controller";
import { PublicCatalogueController } from "./public-catalogue.controller";
import { CatalogueDeletionController } from "./catalogue-deletion.controller";
import { CatalogueDeletionService } from "./catalogue-deletion.service";

@Module({
  controllers: [
    AdminCatalogueController,
    PublicCatalogueController,
    CatalogueDeletionController,
  ],
  providers: [CatalogueService, CatalogueDeletionService],
})
export class CatalogueModule {}
