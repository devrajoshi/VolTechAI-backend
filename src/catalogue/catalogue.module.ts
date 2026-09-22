import { Module } from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";
import { AdminCatalogueController } from "./admin-catalogue.controller";
import { PublicCatalogueController } from "./public-catalogue.controller";

@Module({
  controllers: [AdminCatalogueController, PublicCatalogueController],
  providers: [CatalogueService],
})
export class CatalogueModule {}
