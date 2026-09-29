import { Controller, Get, Param } from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";

@Controller()
export class PublicCatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}
  @Get("services") services() {
    return this.catalogue.publicServices();
  }
  @Get("services/:slug") service(@Param("slug") slug: string) {
    return this.catalogue.publicService(slug);
  }
  @Get("catalogue") catalogueData() {
    return this.catalogue.publicCatalogue();
  }
}
