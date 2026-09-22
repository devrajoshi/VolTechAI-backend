import "reflect-metadata";
import { createHash } from "crypto";
import { readdirSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import * as request from "supertest";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../src/prisma/prisma.service";
import { AuthService } from "../src/auth/auth.service";
import { AdminSessionGuard } from "../src/auth/guards/admin-session.guard";
import { RolesGuard } from "../src/auth/guards/roles.guard";
import { CatalogueService } from "../src/catalogue/catalogue.service";
import { AdminCatalogueController } from "../src/catalogue/admin-catalogue.controller";
import { PublicCatalogueController } from "../src/catalogue/public-catalogue.controller";
import { PackagesService } from "../src/packages/packages.service";
import { PaymentsService } from "../src/payments/payments.service";
import { PaymentsController } from "../src/payments/payments.controller";
import { OrdersService } from "../src/orders/orders.service";

jest.mock("stripe", () => ({
  default: jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: "pi_catalogue_test",
        client_secret: "test_secret",
      }),
    },
  })),
}));

const databaseUrl = process.env.CATALOGUE_TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "Set CATALOGUE_TEST_DATABASE_URL to an empty disposable local PostgreSQL database.",
  );
const target = new URL(databaseUrl);
if (
  !["localhost", "127.0.0.1"].includes(target.hostname) ||
  !/^\/catalogue_test(?:_[a-z0-9]+)?$/.test(target.pathname)
)
  throw new Error(
    "Integration tests require a local database named catalogue_test (or catalogue_test_suffix).",
  );
process.env.DATABASE_URL = databaseUrl;

describe("Catalogue migration, authorization and purchase integration", () => {
  let prisma: PrismaClient;
  let app: INestApplication;
  let payments: PaymentsService;
  let packageId: string;
  let serviceId: string;
  let orderId: string;
  const serviceDto = {
    slug: "test-private-service",
    name: "Test private service",
    summary: "A service for integration verification.",
    heroTitle: "",
    description: "",
    bodyHeading: "",
    bodyText: "",
    sections: [],
    iconKey: "code",
    seoTitle: "",
    seoDescription: "",
    showOnHomepage: true,
    showInFooter: true,
    isPublished: false,
    sortOrder: 100,
  };
  let newServiceId: string;
  let newPackageId: string;
  const auth = (role: string) => ({
    Authorization: "Bearer catalogue-test-" + role,
  });
  function cli(...args: string[]) {
    execFileSync("pnpm", ["prisma", ...args], {
      cwd: join(__dirname, ".."),
      env: { ...process.env, DATABASE_URL: databaseUrl! },
      stdio: "pipe",
    });
  }
  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const tables = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'`;
    if (Number(tables[0].count) !== 0)
      throw new Error(
        "Use an EMPTY database. Tests never reset an existing database.",
      );
    const migrations = readdirSync(join(__dirname, "../prisma/migrations"))
      .filter((name) => /^\d/.test(name))
      .sort();
    for (const migration of migrations.filter(
      (name) => !name.includes("add_service_catalogue"),
    )) {
      cli(
        "db",
        "execute",
        "--url",
        databaseUrl!,
        "--file",
        join("prisma/migrations", migration, "migration.sql"),
      );
      cli("migrate", "resolve", "--applied", migration);
    }
    // Represent an existing live price and completed order before the migration.
    await prisma.$executeRaw`INSERT INTO packages (id,slug,name,amount,currency,"updatedAt") VALUES ('existing-package','website-get-online','Existing custom name',49999,'gbp',CURRENT_TIMESTAMP)`;
    await prisma.$executeRaw`INSERT INTO orders (id,"packageId",amount,currency,"serviceName",status,"updatedAt") VALUES ('existing-order','existing-package',45000,'gbp','Original purchase name','SUCCEEDED',CURRENT_TIMESTAMP)`;
    cli("migrate", "deploy");
    cli("migrate", "deploy"); // Re-running deployment must be a no-op.
    for (const role of ["OWNER", "EDITOR"] as const) {
      await prisma.adminUser.create({
        data: {
          id: "test-" + role,
          email: role.toLowerCase() + "@catalogue.test",
          role,
          passwordHash: "unused",
          sessions: {
            create: {
              tokenHash: createHash("sha256")
                .update("catalogue-test-" + role)
                .digest("hex"),
              expiresAt: new Date(Date.now() + 3600000),
            },
          },
        },
      });
    }
    const module = await Test.createTestingModule({
      controllers: [
        AdminCatalogueController,
        PublicCatalogueController,
        PaymentsController,
      ],
      providers: [
        CatalogueService,
        AuthService,
        AdminSessionGuard,
        RolesGuard,
        PackagesService,
        PaymentsService,
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, fallback?: unknown) => fallback,
            getOrThrow: () => "sk_test_mock_only",
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    payments = app.get(PaymentsService);
    const existing = await prisma.package.findUniqueOrThrow({
      where: { slug: "website-get-online" },
    });
    packageId = existing.id;
    serviceId = existing.serviceId!;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  it("imports all content and preserves existing package and order snapshots", async () => {
    expect(await prisma.service.count()).toBe(9);
    expect(await prisma.package.count()).toBe(21);
    expect(await prisma.bundle.count()).toBe(8);
    expect(
      await prisma.package.findUnique({ where: { id: "existing-package" } }),
    ).toMatchObject({
      name: "Existing custom name",
      amount: 49999,
      priceType: "STARTING_FROM",
      purchasable: false,
    });
    expect(
      await prisma.order.findUnique({ where: { id: "existing-order" } }),
    ).toMatchObject({
      packageId: "existing-package",
      serviceName: "Original purchase name",
      amount: 45000,
      status: "SUCCEEDED",
    });
    const bundle = await prisma.bundle.findFirst({
      include: { components: true },
    });
    expect(bundle?.components.length).toBeGreaterThan(0);
  });

  it("rejects anonymous and editor access to every catalogue resource", async () => {
    for (const resource of ["services", "packages", "bundles"]) {
      await request(app.getHttpServer())
        .get("/api/admin/cms/" + resource)
        .expect(401);
      await request(app.getHttpServer())
        .get("/api/admin/cms/" + resource)
        .set(auth("EDITOR"))
        .expect(403);
      await request(app.getHttpServer())
        .post("/api/admin/cms/" + resource)
        .set(auth("EDITOR"))
        .send({})
        .expect(403);
      await request(app.getHttpServer())
        .patch("/api/admin/cms/" + resource + "/unknown")
        .set(auth("EDITOR"))
        .send({})
        .expect(403);
      await request(app.getHttpServer())
        .delete("/api/admin/cms/" + resource + "/unknown")
        .set(auth("EDITOR"))
        .expect(403);
    }
  });

  it("creates draft content with validation and protects reserved aliases", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/cms/services")
      .set(auth("OWNER"))
      .send({ ...serviceDto, extra: true })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/admin/cms/services")
      .set(auth("OWNER"))
      .send({ ...serviceDto, slug: "web-services" })
      .expect(409);
    const result = await request(app.getHttpServer())
      .post("/api/admin/cms/services")
      .set(auth("OWNER"))
      .send(serviceDto)
      .expect(201);
    newServiceId = result.body.id;
    await request(app.getHttpServer())
      .get("/api/services/" + serviceDto.slug)
      .expect(404);
    await request(app.getHttpServer())
      .post("/api/admin/cms/services")
      .set(auth("OWNER"))
      .send(serviceDto)
      .expect(409);
    const published = await request(app.getHttpServer())
      .patch("/api/admin/cms/services/" + newServiceId)
      .set(auth("OWNER"))
      .send({
        ...serviceDto,
        isPublished: true,
        sections: [{ title: "Custom section", description: "From the CMS" }],
      })
      .expect(200);
    expect(published.body.updatedById).toBe("test-OWNER");
    const publicPage = await request(app.getHttpServer())
      .get("/api/services/" + serviceDto.slug)
      .expect(200);
    expect(publicPage.body.sections[0].title).toBe("Custom section");
    expect(publicPage.body).not.toHaveProperty("updatedById");
    await request(app.getHttpServer())
      .patch("/api/admin/cms/services/" + newServiceId)
      .set(auth("OWNER"))
      .send({ ...serviceDto, slug: "changed-url" })
      .expect(409);
    await request(app.getHttpServer())
      .delete("/api/admin/cms/services/" + newServiceId)
      .set(auth("OWNER"))
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/services/" + serviceDto.slug)
      .expect(404);
  });

  it("resolves legacy service URLs to canonical content", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/services/digital-marketing-seo")
      .expect(200);
    expect(response.body.slug).toBe("seo");
    const web = await request(app.getHttpServer())
      .get("/api/services/web-services")
      .expect(200);
    expect(web.body.slug).toBe("website-design-development");
  });

  it("rejects from-price checkout before order creation or Stripe access", async () => {
    const count = await prisma.order.count();
    await request(app.getHttpServer())
      .post("/api/payments/checkout")
      .send({ packageId: "website-get-online" })
      .expect(400);
    expect(await prisma.order.count()).toBe(count);
    expect(
      payments.getStripeClient().paymentIntents.create,
    ).not.toHaveBeenCalled();
  });

  it("validates commercial fields and creates an eligible fixed-price offer", async () => {
    const offer = {
      slug: "test-fixed-offer",
      serviceId,
      name: "Fixed test offer",
      tier: "Starter",
      shortDescription: "A fixed-price integration test offer.",
      features: ["One feature"],
      bestFor: "",
      priceType: "FIXED",
      billingType: "ONE_TIME",
      amount: 12345,
      currency: "gbp",
      purchasable: true,
      isPublished: true,
      isActive: true,
      sortOrder: 100,
    };
    for (const invalid of [
      { priceType: "STARTING_FROM" },
      { billingType: "MONTHLY" },
      { amount: null },
      { amount: 0 },
    ]) {
      await request(app.getHttpServer())
        .post("/api/admin/cms/packages")
        .set(auth("OWNER"))
        .send({ ...offer, ...invalid })
        .expect(400);
    }
    const response = await request(app.getHttpServer())
      .post("/api/admin/cms/packages")
      .set(auth("OWNER"))
      .send(offer)
      .expect(201);
    newPackageId = response.body.id;
    const checkout = await request(app.getHttpServer())
      .post("/api/payments/checkout")
      .send({ packageId: offer.slug })
      .expect(200);
    expect(checkout.body.amount).toBe(12345);
    orderId = checkout.body.orderId;
    expect(
      payments.getStripeClient().paymentIntents.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 12345, currency: "gbp" }),
    );
    await request(app.getHttpServer())
      .patch("/api/admin/cms/packages/" + newPackageId)
      .set(auth("OWNER"))
      .send({ ...offer, name: "Revised offer name", amount: 54321 })
      .expect(200);
    expect(
      await prisma.order.findUnique({ where: { id: orderId } }),
    ).toMatchObject({ amount: 12345, serviceName: offer.name });
  });

  it("creates and edits bundles and filters them when a component is archived", async () => {
    const dto = {
      slug: "test-bundle",
      name: "Test bundle",
      shortDescription: "A custom enquiry bundle for tests.",
      packageIds: [newPackageId, packageId],
      isSignature: false,
      isPublished: true,
      sortOrder: 100,
    };
    await request(app.getHttpServer())
      .post("/api/admin/cms/bundles")
      .set(auth("OWNER"))
      .send({ ...dto, packageIds: ["missing"] })
      .expect(400);
    const response = await request(app.getHttpServer())
      .post("/api/admin/cms/bundles")
      .set(auth("OWNER"))
      .send(dto)
      .expect(201);
    const id = response.body.id;
    const catalogue = await request(app.getHttpServer())
      .get("/api/catalogue")
      .expect(200);
    expect(
      catalogue.body.bundles.some((bundle: { id: string }) => bundle.id === id),
    ).toBe(true);
    await request(app.getHttpServer())
      .patch("/api/admin/cms/bundles/" + id)
      .set(auth("OWNER"))
      .send({ ...dto, packageIds: [newPackageId] })
      .expect(200);
    expect(
      await prisma.bundleComponent.count({ where: { bundleId: id } }),
    ).toBe(1);
    await request(app.getHttpServer())
      .delete("/api/admin/cms/packages/" + newPackageId)
      .set(auth("OWNER"))
      .expect(200);
    const updated = await request(app.getHttpServer())
      .get("/api/catalogue")
      .expect(200);
    expect(
      updated.body.bundles.some((bundle: { id: string }) => bundle.id === id),
    ).toBe(false);
    await request(app.getHttpServer())
      .post("/api/payments/checkout")
      .send({ packageId: "test-fixed-offer" })
      .expect(404);
    expect(
      await prisma.order.findUnique({ where: { id: orderId } }),
    ).not.toBeNull();
    await request(app.getHttpServer())
      .delete("/api/admin/cms/bundles/" + id)
      .set(auth("OWNER"))
      .expect(200);
  });

  it("hides a service and its packages and dependent bundles when unpublished", async () => {
    await request(app.getHttpServer())
      .delete("/api/admin/cms/services/" + serviceId)
      .set(auth("OWNER"))
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/services/website-design-development")
      .expect(404);
    await request(app.getHttpServer())
      .get("/api/services/web-services")
      .expect(404);
    const result = await request(app.getHttpServer())
      .get("/api/catalogue")
      .expect(200);
    expect(
      result.body.services.some(
        (service: { id: string }) => service.id === serviceId,
      ),
    ).toBe(false);
    expect(
      result.body.bundles.every(
        (bundle: { components: { package: { id: string } }[] }) =>
          bundle.components.every(
            (component) => component.package.id !== packageId,
          ),
      ),
    ).toBe(true);
  });

  it("seed reruns do not overwrite catalogue edits or delete historical records", async () => {
    execFileSync("pnpm", ["db:seed"], {
      cwd: join(__dirname, ".."),
      env: { ...process.env, DATABASE_URL: databaseUrl! },
      stdio: "pipe",
    });
    expect(
      await prisma.package.findUnique({ where: { id: packageId } }),
    ).toMatchObject({ amount: 49999, name: "Existing custom name" });
    expect(await prisma.order.count()).toBe(2);
  });
});
