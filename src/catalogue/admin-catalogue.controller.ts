import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminRole } from "@prisma/client";
import { CurrentAdmin } from "../auth/decorators/current-admin.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AdminSessionGuard } from "../auth/guards/admin-session.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedAdmin } from "../auth/auth.types";
import { CatalogueService } from "./catalogue.service";
import { BundleDto, PackageDto, ServiceDto } from "./dto/catalogue.dto";

@UseGuards(AdminSessionGuard, RolesGuard)
@Roles(AdminRole.OWNER)
@Controller("admin/cms")
export class AdminCatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get("services") services() {
    return this.catalogue.services();
  }
  @Get("services/:id") service(@Param("id") id: string) {
    return this.catalogue.service(id);
  }
  @Post("services") createService(
    @Body() dto: ServiceDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.catalogue.createService(dto, admin.id);
  }
  @Patch("services/:id") updateService(
    @Param("id") id: string,
    @Body() dto: ServiceDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.catalogue.updateService(id, dto, admin.id);
  }
  @Delete("services/:id") archiveService(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.catalogue.archiveService(id, admin.id);
  }

  @Get("packages") packages() {
    return this.catalogue.packages();
  }
  @Get("packages/:id") package(@Param("id") id: string) {
    return this.catalogue.package(id);
  }
  @Post("packages") createPackage(
    @Body() dto: PackageDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.catalogue.createPackage(dto, admin.id);
  }
  @Patch("packages/:id") updatePackage(
    @Param("id") id: string,
    @Body() dto: PackageDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.catalogue.updatePackage(id, dto, admin.id);
  }
  @Delete("packages/:id") archivePackage(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.catalogue.archivePackage(id, admin.id);
  }

  @Get("bundles") bundles() {
    return this.catalogue.bundles();
  }
  @Get("bundles/:id") bundle(@Param("id") id: string) {
    return this.catalogue.bundle(id);
  }
  @Post("bundles") createBundle(
    @Body() dto: BundleDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.catalogue.createBundle(dto, admin.id);
  }
  @Patch("bundles/:id") updateBundle(
    @Param("id") id: string,
    @Body() dto: BundleDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.catalogue.updateBundle(id, dto, admin.id);
  }
  @Delete("bundles/:id") archiveBundle(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.catalogue.archiveBundle(id, admin.id);
  }
}
