import { BadRequestException } from '@nestjs/common';
import { InquiryKind, InquirySource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InquiriesService } from './inquiries.service';

describe('InquiriesService', () => {
  const inquiryCreate = jest.fn();
  const serviceFindFirst = jest.fn();
  const packageFindFirst = jest.fn();
  const inquiryFindMany = jest.fn();
  const inquiryCount = jest.fn();
  const prisma = {
    service: { findFirst: serviceFindFirst },
    package: { findFirst: packageFindFirst },
    bundle: { findFirst: jest.fn() },
    inquiry: { create: inquiryCreate, findMany: inquiryFindMany, count: inquiryCount },
  } as unknown as PrismaService;
  let inquiries: InquiriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    inquiries = new InquiriesService(prisma);
    inquiryCreate.mockResolvedValue({ id: 'inq_1', createdAt: new Date('2026-09-27T00:00:00Z') });
  });

  it('stores a general inquiry and normalizes contact fields', async () => {
    const response = await inquiries.create({
      name: '  Alex Smith  ',
      email: '  ALEX@example.com ',
      subject: '  Project enquiry  ',
      message: '  I would like to discuss a project.  ',
      kind: InquiryKind.GENERAL,
      source: InquirySource.CONTACT_PAGE,
    });

    expect(response).toMatchObject({ received: true, id: 'inq_1' });
    expect(inquiryCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Alex Smith',
        email: 'alex@example.com',
        subject: 'Project enquiry',
        message: 'I would like to discuss a project.',
        kind: InquiryKind.GENERAL,
        source: InquirySource.CONTACT_PAGE,
      }),
    }));
  });

  it('stores a validated package with its service and immutable catalogue snapshots', async () => {
    serviceFindFirst.mockResolvedValue({ id: 'svc_1', name: 'Website Development' });
    packageFindFirst.mockResolvedValue({
      id: 'pkg_1', name: 'Growth Website', tier: 'Growth', amount: 120000,
      currency: 'gbp', priceType: 'FIXED', billingType: 'ONE_TIME', serviceId: 'svc_1',
      service: { id: 'svc_1', name: 'Website Development' },
    });

    await inquiries.create({
      name: 'Alex Smith',
      email: 'alex@example.com',
      subject: 'Growth website enquiry',
      message: 'Please tell me more about this package.',
      kind: InquiryKind.PACKAGE,
      source: InquirySource.PRICING_PAGE,
      serviceSlug: 'website-development',
      packageSlug: 'growth-website',
    });

    expect(serviceFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { slug: 'website-development', isPublished: true },
    }));
    expect(inquiryCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        serviceId: 'svc_1', packageId: 'pkg_1',
        serviceNameSnapshot: 'Website Development', packageNameSnapshot: 'Growth Website',
        packageTierSnapshot: 'Growth', packagePriceSnapshot: 'FIXED:120000:gbp:ONE_TIME',
      }),
    }));
  });

  it('rejects unavailable service context without creating a record', async () => {
    serviceFindFirst.mockResolvedValue(null);

    await expect(inquiries.create({
      name: 'Alex Smith', email: 'alex@example.com', subject: 'Service question',
      message: 'Please tell me more about this service.', kind: InquiryKind.SERVICE,
      source: InquirySource.SERVICE_PAGE, serviceSlug: 'unknown-service',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(inquiryCreate).not.toHaveBeenCalled();
  });

  it('accepts honeypot submissions without storing them', async () => {
    await expect(inquiries.create({
      name: 'Bot', email: 'bot@example.com', subject: 'Spam',
      message: 'This message is long enough to pass validation.', kind: InquiryKind.GENERAL,
      source: InquirySource.CONTACT_PAGE, honeypot: 'filled',
    })).resolves.toEqual({ received: true });

    expect(inquiryCreate).not.toHaveBeenCalled();
  });

  it('paginates the admin list and searches About-page interests', async () => {
    inquiryFindMany.mockResolvedValue([]);
    inquiryCount.mockResolvedValue(0);

    const result = await inquiries.list({ page: 2, limit: 10, q: 'cybersecurity' });

    expect(result).toMatchObject({ page: 2, limit: 10, total: 0, totalPages: 1 });
    expect(inquiryFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(inquiryFindMany.mock.calls[0][0].where.OR).toContainEqual({
      interest: { contains: 'cybersecurity', mode: 'insensitive' },
    });
  });
});
