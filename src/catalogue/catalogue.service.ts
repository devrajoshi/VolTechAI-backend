import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { BundleDto, PackageDto, ServiceDto } from "./dto/catalogue.dto";

const orderBy = [{ sortOrder: "asc" as const }, { name: "asc" as const }];
const packageSelect = {
  id: true,
  slug: true,
  name: true,
  tier: true,
  shortDescription: true,
  features: true,
  bestFor: true,
  amount: true,
  currency: true,
  priceType: true,
  billingType: true,
  purchasable: true,
  sortOrder: true,
} satisfies Prisma.PackageSelect;
const serviceSelect = {
  id: true,
  slug: true,
  name: true,
  summary: true,
  heroTitle: true,
  description: true,
  bodyHeading: true,
  bodyText: true,
  sections: true,
  iconKey: true,
  seoTitle: true,
  seoDescription: true,
  showOnHomepage: true,
  showInFooter: true,
  sortOrder: true,
  updatedAt: true,
  packages: {
    where: { isPublished: true, isActive: true },
    orderBy,
    select: packageSelect,
  },
} satisfies Prisma.ServiceSelect;

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  publicServices() {
    return this.prisma.service.findMany({
      where: { isPublished: true },
      orderBy,
      select: serviceSelect,
    });
  }

  async publicService(slug: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        isPublished: true,
        OR: [{ slug }, { aliases: { some: { slug } } }],
      },
      select: serviceSelect,
    });
    if (!service) throw new NotFoundException("Service not found.");
    return service;
  }

  async publicCatalogue() {
    const [services, bundles] = await Promise.all([
      this.publicServices(),
      this.prisma.bundle.findMany({
        // Never show a partial bundle or leak an unpublished package/service.
        where: {
          isPublished: true,
          components: {
            some: {},
            every: {
              package: {
                isActive: true,
                isPublished: true,
                service: { isPublished: true },
              },
            },
          },
        },
        orderBy,
        select: {
          id: true,
          slug: true,
          name: true,
          shortDescription: true,
          isSignature: true,
          components: {
            orderBy: { sortOrder: "asc" },
            select: {
              package: {
                select: {
                  ...packageSelect,
                  service: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
    ]);
    return { services, bundles };
  }

  services() {
    return this.prisma.service.findMany({
      orderBy,
      include: { _count: { select: { packages: true } } },
    });
  }
  async service(id: string) {
    const value = await this.prisma.service.findUnique({ where: { id } });
    if (!value) throw new NotFoundException("Service not found.");
    return value;
  }
  packages() {
    return this.prisma.package.findMany({
      orderBy,
      include: { service: { select: { name: true } } },
    });
  }
  async package(id: string) {
    const value = await this.prisma.package.findUnique({ where: { id } });
    if (!value) throw new NotFoundException("Package not found.");
    return value;
  }
  bundles() {
    return this.prisma.bundle.findMany({
      orderBy,
      include: { components: { orderBy: { sortOrder: "asc" } } },
    });
  }
  async bundle(id: string) {
    const value = await this.prisma.bundle.findUnique({
      where: { id },
      include: { components: { orderBy: { sortOrder: "asc" } } },
    });
    if (!value) throw new NotFoundException("Bundle not found.");
    return value;
  }

  private assertSlug(current: string, next: string) {
    if (current !== next)
      throw new ConflictException(
        "Slugs cannot be changed after creation; existing links must stay valid.",
      );
  }
  private async write<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("This slug is already in use.");
      throw error;
    }
  }
  async createService(dto: ServiceDto, adminId: string) {
    if (
      await this.prisma.serviceAlias.findUnique({ where: { slug: dto.slug } })
    )
      throw new ConflictException(
        "This slug is reserved by an existing service URL.",
      );
    return this.write(() =>
      this.prisma.service.create({
        data: {
          ...dto,
          sections: dto.sections.map((section) => ({ ...section })),
          createdById: adminId,
          updatedById: adminId,
        },
      }),
    );
  }
  async updateService(id: string, dto: ServiceDto, adminId: string) {
    this.assertSlug((await this.service(id)).slug, dto.slug);
    return this.prisma.service.update({
      where: { id },
      data: {
        ...dto,
        sections: dto.sections.map((section) => ({ ...section })),
        updatedById: adminId,
      },
    });
  }
  async archiveService(id: string, adminId: string) {
    await this.service(id);
    return this.prisma.service.update({
      where: { id },
      data: { isPublished: false, updatedById: adminId },
    });
  }

  private async validatePackage(dto: PackageDto) {
    await this.service(dto.serviceId);
    if (dto.priceType !== "POA" && dto.amount === null)
      throw new BadRequestException(
        "Fixed and starting prices require an amount.",
      );
    if (dto.priceType === "POA" && dto.amount !== null)
      throw new BadRequestException(
        "Price on application must have an empty amount.",
      );
    if (
      dto.purchasable &&
      (dto.priceType !== "FIXED" ||
        dto.billingType !== "ONE_TIME" ||
        dto.amount === null ||
        dto.amount < 30 ||
        dto.currency !== "gbp")
    )
      throw new BadRequestException(
        "Direct checkout requires a fixed one-time GBP price of at least £0.30.",
      );
  }
  async createPackage(dto: PackageDto, adminId: string) {
    await this.validatePackage(dto);
    return this.write(() =>
      this.prisma.package.create({ data: { ...dto, updatedById: adminId } }),
    );
  }
  async updatePackage(id: string, dto: PackageDto, adminId: string) {
    this.assertSlug((await this.package(id)).slug, dto.slug);
    await this.validatePackage(dto);
    return this.prisma.package.update({
      where: { id },
      data: { ...dto, updatedById: adminId },
    });
  }
  async archivePackage(id: string, adminId: string) {
    await this.package(id);
    return this.prisma.package.update({
      where: { id },
      data: { isPublished: false, isActive: false, updatedById: adminId },
    });
  }
  private async validateBundle(dto: BundleDto) {
    if (dto.isPublished && !dto.packageIds.length)
      throw new BadRequestException(
        "A published bundle needs at least one package.",
      );
    const count = await this.prisma.package.count({
      where: { id: { in: dto.packageIds } },
    });
    if (count !== dto.packageIds.length)
      throw new BadRequestException(
        "One or more selected packages no longer exist.",
      );
    if (dto.isPublished) {
      const available = await this.prisma.package.count({
        where: {
          id: { in: dto.packageIds },
          isPublished: true,
          isActive: true,
          service: { isPublished: true },
        },
      });
      if (available !== dto.packageIds.length)
        throw new BadRequestException(
          "Publish each component package and service before publishing this bundle.",
        );
    }
  }
  async createBundle(dto: BundleDto, adminId: string) {
    await this.validateBundle(dto);
    const { packageIds, ...data } = dto;
    return this.write(() =>
      this.prisma.bundle.create({
        data: {
          ...data,
          updatedById: adminId,
          components: {
            create: packageIds.map((packageId, sortOrder) => ({
              packageId,
              sortOrder,
            })),
          },
        },
      }),
    );
  }
  async updateBundle(id: string, dto: BundleDto, adminId: string) {
    this.assertSlug((await this.bundle(id)).slug, dto.slug);
    await this.validateBundle(dto);
    const { packageIds, ...data } = dto;
    return this.prisma.bundle.update({
      where: { id },
      data: {
        ...data,
        updatedById: adminId,
        components: {
          deleteMany: {},
          create: packageIds.map((packageId, sortOrder) => ({
            packageId,
            sortOrder,
          })),
        },
      },
    });
  }
  async archiveBundle(id: string, adminId: string) {
    await this.bundle(id);
    return this.prisma.bundle.update({
      where: { id },
      data: { isPublished: false, updatedById: adminId },
    });
  }
}
