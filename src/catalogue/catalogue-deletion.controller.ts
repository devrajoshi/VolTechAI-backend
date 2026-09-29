import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
} from "@nestjs/common";
import { AdminRole } from "@prisma/client";
import { IsNotEmpty, IsString } from "class-validator";
import { CurrentAdmin } from "../auth/decorators/current-admin.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AdminSessionGuard } from "../auth/guards/admin-session.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedAdmin } from "../auth/auth.types";
import {
  CatalogueDeletionService,
  CatalogueResource,
} from "./catalogue-deletion.service";

class ConfirmDeletionDto {
  @IsString()
  @IsNotEmpty()
  slug: string;
}

function resourceOf(value: string): CatalogueResource {
  if (value === "services" || value === "packages" || value === "bundles")
    return value;
  throw new BadRequestException("Unknown catalogue resource.");
}

@UseGuards(AdminSessionGuard, RolesGuard)
@Roles(AdminRole.OWNER)
@Controller("admin/cms")
export class CatalogueDeletionController {
  constructor(private readonly deletion: CatalogueDeletionService) {}

  @Get(":resource/:id/deletion-check")
  preview(@Param("resource") resource: string, @Param("id") id: string) {
    return this.deletion.preview(resourceOf(resource), id);
  }

  @Delete(":resource/:id/permanent")
  delete(
    @Param("resource") resource: string,
    @Param("id") id: string,
    @Body() dto: ConfirmDeletionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.deletion.delete(resourceOf(resource), id, dto.slug, admin);
  }
}
