import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthenticatedAdmin } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

export type CatalogueResource = "services" | "packages" | "bundles";
type Db = Prisma.TransactionClient;
type LinkedRecord = { id: string; label: string; detail?: string };
type Blocker = {
  code: string;
  label: string;
  count: number;
  records?: LinkedRecord[];
};
const PREVIEW_RECORD_LIMIT = 25;

@Injectable()
export class CatalogueDeletionService {
  constructor(private readonly prisma: PrismaService) {}

  private async inspect(resource: CatalogueResource, id: string, db: Db) {
    let name: string;
    let slug: string;
    const blockers: Blocker[] = [];
    const effects: { aliases?: number; componentLinks?: number } = {};

    const block = (
      code: string,
      label: string,
      count: number,
      records?: LinkedRecord[],
    ) => {
      if (count)
        blockers.push({ code, label, count, ...(records ? { records } : {}) });
    };

    if (resource === "services") {
      const service = await db.service.findUnique({
        where: { id },
        select: {
          name: true,
          slug: true,
          isPublished: true,
          _count: {
            select: { packages: true, inquiries: true, aliases: true },
          },
        },
      });
      if (!service) throw new NotFoundException("Service not found.");
      name = service.name;
      slug = service.slug;
      block(
        "published",
        "Unpublish this service first",
        Number(service.isPublished),
      );
      const packages = service._count.packages
        ? await db.package.findMany({
            where: { serviceId: id },
            take: PREVIEW_RECORD_LIMIT,
            orderBy: { name: "asc" },
            select: { id: true, name: true, isPublished: true, isActive: true },
          })
        : [];
      block(
        "packages",
        "Linked packages",
        service._count.packages,
        packages.map((item) => ({
          id: item.id,
          label: item.name,
          detail: item.isPublished
            ? "Published"
            : item.isActive
              ? "Unpublished, active"
              : "Archived",
        })),
      );
      const inquiries = service._count.inquiries
        ? await db.inquiry.findMany({
            where: { serviceId: id },
            take: PREVIEW_RECORD_LIMIT,
            orderBy: { createdAt: "desc" },
            select: { id: true, subject: true, name: true, status: true },
          })
        : [];
      block(
        "inquiries",
        "Linked inquiries",
        service._count.inquiries,
        inquiries.map((item) => ({
          id: item.id,
          label: item.subject,
          detail: item.name + " · " + item.status.replaceAll("_", " "),
        })),
      );
      effects.aliases = service._count.aliases;
    } else if (resource === "packages") {
      const offer = await db.package.findUnique({
        where: { id },
        select: {
          name: true,
          slug: true,
          isPublished: true,
          isActive: true,
          _count: {
            select: { orders: true, inquiries: true, bundleComponents: true },
          },
        },
      });
      if (!offer) throw new NotFoundException("Package not found.");
      name = offer.name;
      slug = offer.slug;
      block(
        "published",
        "Unpublish this package first",
        Number(offer.isPublished),
      );
      block("active", "Deactivate this package first", Number(offer.isActive));
      const memberships = offer._count.bundleComponents
        ? await db.bundleComponent.findMany({
            where: { packageId: id },
            take: PREVIEW_RECORD_LIMIT,
            orderBy: { bundleId: "asc" },
            select: {
              bundle: { select: { id: true, name: true, isPublished: true } },
            },
          })
        : [];
      block(
        "bundles",
        "Linked bundles",
        offer._count.bundleComponents,
        memberships.map(({ bundle }) => ({
          id: bundle.id,
          label: bundle.name,
          detail: bundle.isPublished ? "Published" : "Unpublished",
        })),
      );
      const orders = offer._count.orders
        ? await db.order.findMany({
            where: { packageId: id },
            take: PREVIEW_RECORD_LIMIT,
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true, serviceName: true },
          })
        : [];
      block(
        "orders",
        "Linked orders",
        offer._count.orders,
        orders.map((item) => ({
          id: item.id,
          label: item.serviceName,
          detail: "Order " + item.id + " · " + item.status,
        })),
      );
      const inquiries = offer._count.inquiries
        ? await db.inquiry.findMany({
            where: { packageId: id },
            take: PREVIEW_RECORD_LIMIT,
            orderBy: { createdAt: "desc" },
            select: { id: true, subject: true, name: true, status: true },
          })
        : [];
      block(
        "inquiries",
        "Linked inquiries",
        offer._count.inquiries,
        inquiries.map((item) => ({
          id: item.id,
          label: item.subject,
          detail: item.name + " · " + item.status.replaceAll("_", " "),
        })),
      );
    } else {
      const bundle = await db.bundle.findUnique({
        where: { id },
        select: {
          name: true,
          slug: true,
          isPublished: true,
          _count: { select: { inquiries: true, components: true } },
        },
      });
      if (!bundle) throw new NotFoundException("Bundle not found.");
      name = bundle.name;
      slug = bundle.slug;
      block(
        "published",
        "Unpublish this bundle first",
        Number(bundle.isPublished),
      );
      const inquiries = bundle._count.inquiries
        ? await db.inquiry.findMany({
            where: { bundleId: id },
            take: PREVIEW_RECORD_LIMIT,
            orderBy: { createdAt: "desc" },
            select: { id: true, subject: true, name: true, status: true },
          })
        : [];
      block(
        "inquiries",
        "Linked inquiries",
        bundle._count.inquiries,
        inquiries.map((item) => ({
          id: item.id,
          label: item.subject,
          detail: item.name + " · " + item.status.replaceAll("_", " "),
        })),
      );
      effects.componentLinks = bundle._count.components;
    }

    return {
      resource,
      id,
      name,
      slug,
      canDelete: blockers.length === 0,
      blockers,
      effects,
    };
  }

  preview(resource: CatalogueResource, id: string) {
    return this.inspect(resource, id, this.prisma);
  }

  private async lock(db: Db, resource: CatalogueResource, id: string) {
    const rows =
      resource === "services"
        ? await db.$queryRaw<
            { id: string }[]
          >`SELECT id FROM "services" WHERE id = ${id} FOR UPDATE`
        : resource === "packages"
          ? await db.$queryRaw<
              { id: string }[]
            >`SELECT id FROM "packages" WHERE id = ${id} FOR UPDATE`
          : await db.$queryRaw<
              { id: string }[]
            >`SELECT id FROM "bundles" WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException("Catalogue item not found.");
  }

  async delete(
    resource: CatalogueResource,
    id: string,
    confirmSlug: string,
    admin: AuthenticatedAdmin,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lock(tx, resource, id);
        const check = await this.inspect(resource, id, tx);
        if (check.slug !== confirmSlug)
          throw new ConflictException(
            "The confirmation slug does not match this item.",
          );
        if (!check.canDelete)
          throw new ConflictException({
            message: "This item cannot be deleted while dependencies remain.",
            blockers: check.blockers,
          });

        if (resource === "services") await tx.service.delete({ where: { id } });
        else if (resource === "packages")
          await tx.package.delete({ where: { id } });
        else await tx.bundle.delete({ where: { id } });

        await tx.catalogueDeletion.create({
          data: {
            resource,
            recordId: id,
            name: check.name,
            slug: check.slug,
            actorId: admin.id,
            actorEmail: admin.email,
          },
        });
        return { deleted: true, resource, id };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003")
          throw new ConflictException(
            "A new linked record prevents deletion. Refresh and try again.",
          );
        if (error.code === "P2025")
          throw new NotFoundException("Catalogue item not found.");
      }
      throw error;
    }
  }
}
