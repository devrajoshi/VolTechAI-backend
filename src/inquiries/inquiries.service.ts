import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InquiryKind, InquiryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';

const inquiryInclude = {
    service: { select: { id: true, slug: true, name: true } },
    package: { select: { id: true, slug: true, name: true, tier: true, amount: true, currency: true, priceType: true, billingType: true } },
    bundle: { select: { id: true, slug: true, name: true } },
    assignedAdmin: { select: { id: true, email: true } },
} satisfies Prisma.InquiryInclude;

@Injectable()
export class InquiriesService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateInquiryDto) {
        if (dto.honeypot?.trim()) return { received: true };
        let service: { id: string; name: string } | null = null;
        let offer: { id: string; name: string; tier: string; amount: number | null; currency: string; priceType: string; billingType: string; serviceId: string | null; service: { id: string; name: string } | null } | null = null;
        let bundle: { id: string; name: string } | null = null;

        if (dto.serviceSlug) {
            service = await this.prisma.service.findFirst({ where: { slug: dto.serviceSlug, isPublished: true }, select: { id: true, name: true } });
            if (!service) throw new BadRequestException('The selected service is unavailable.');
        }
        if (dto.packageSlug) {
            offer = await this.prisma.package.findFirst({
                where: { slug: dto.packageSlug, isPublished: true, isActive: true, service: { isPublished: true } },
                select: { id: true, name: true, tier: true, amount: true, currency: true, priceType: true, billingType: true, serviceId: true, service: { select: { id: true, name: true } } },
            });
            if (!offer) throw new BadRequestException('The selected package is unavailable.');
            if (!offer.service || !offer.serviceId) throw new BadRequestException('The selected package is not linked to a service.');
            if (service && service.id !== offer.serviceId) throw new BadRequestException('The selected package does not belong to that service.');
            service = offer.service;
        }
        if (dto.bundleSlug) {
            bundle = await this.prisma.bundle.findFirst({
                where: { slug: dto.bundleSlug, isPublished: true, components: { some: {}, every: { package: { isActive: true, isPublished: true, service: { isPublished: true } } } } },
                select: { id: true, name: true },
            });
            if (!bundle) throw new BadRequestException('The selected bundle is unavailable.');
        }
        const contextCount = Number(Boolean(dto.serviceSlug)) + Number(Boolean(dto.packageSlug)) + Number(Boolean(dto.bundleSlug));
        if (contextCount > 1 && !(offer && dto.serviceSlug && service?.id === offer.serviceId)) throw new BadRequestException('Choose one service, package, or bundle context.');
        if (dto.kind === InquiryKind.SERVICE && !service) throw new BadRequestException('A service must be selected.');
        if (dto.kind === InquiryKind.PACKAGE && !offer) throw new BadRequestException('A package must be selected.');
        if (dto.kind === InquiryKind.BUNDLE && !bundle) throw new BadRequestException('A bundle must be selected.');
        if (dto.kind === InquiryKind.GENERAL && (service || offer || bundle)) throw new BadRequestException('Contextual inquiries must include the matching inquiry type.');

        const inquiry = await this.prisma.inquiry.create({
            data: {
                name: dto.name.trim(), email: dto.email.trim().toLowerCase(), phone: dto.phone?.trim() || null,
                company: dto.company?.trim() || null, website: dto.website?.trim() || null,
                subject: dto.subject.trim(), message: dto.message.trim(), interest: dto.interest?.trim() || null, budget: dto.budget?.trim() || null,
                timeline: dto.timeline?.trim() || null, kind: dto.kind, source: dto.source,
                sourcePath: dto.sourcePath?.slice(0, 500) || null, serviceId: service?.id,
                packageId: offer?.id, bundleId: bundle?.id, serviceNameSnapshot: service?.name,
                packageNameSnapshot: offer?.name, bundleNameSnapshot: bundle?.name,
                packageTierSnapshot: offer?.tier,
                packagePriceSnapshot: offer ? `${offer.priceType}:${offer.amount ?? 'POA'}:${offer.currency}:${offer.billingType}` : null,
            },
            select: { id: true, createdAt: true },
        });
        return { received: true, id: inquiry.id, createdAt: inquiry.createdAt };
    }

    async list(options: { page: number; limit: number; q?: string; status?: InquiryStatus }) {
        const page = Math.max(1, Number.isFinite(options.page) ? options.page : 1);
        const limit = Math.min(50, Math.max(1, Number.isFinite(options.limit) ? options.limit : 10));
        if (options.status && !Object.values(InquiryStatus).includes(options.status)) throw new BadRequestException('Invalid inquiry status.');
        const search = options.q?.trim();
        const where: Prisma.InquiryWhereInput = {
            ...(options.status ? { status: options.status } : {}),
            ...(search ? { OR: [
                { name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } }, { subject: { contains: search, mode: 'insensitive' } },
                { interest: { contains: search, mode: 'insensitive' } },
                { serviceNameSnapshot: { contains: search, mode: 'insensitive' } }, { packageNameSnapshot: { contains: search, mode: 'insensitive' } },
                { bundleNameSnapshot: { contains: search, mode: 'insensitive' } },
            ] } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.inquiry.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
                select: { id: true, name: true, email: true, company: true, subject: true, kind: true, source: true, status: true, serviceNameSnapshot: true, packageNameSnapshot: true, bundleNameSnapshot: true, packageTierSnapshot: true, interest: true, createdAt: true, updatedAt: true, assignedAdmin: { select: { id: true, email: true } } } }),
            this.prisma.inquiry.count({ where }),
        ]);
        return { data, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
    }

    async get(id: string) {
        const inquiry = await this.prisma.inquiry.findUnique({ where: { id }, include: { ...inquiryInclude, notes: { orderBy: { createdAt: 'desc' }, include: { admin: { select: { email: true } } } } } });
        if (!inquiry) throw new NotFoundException('Inquiry not found.');
        return inquiry;
    }

    async update(id: string, dto: UpdateInquiryDto) {
        await this.get(id);
        if (dto.assignedAdminId) {
            const admin = await this.prisma.adminUser.findFirst({ where: { id: dto.assignedAdminId, isActive: true }, select: { id: true } });
            if (!admin) throw new BadRequestException('The selected admin is unavailable.');
        }
        return this.prisma.inquiry.update({ where: { id }, data: { ...(dto.status ? { status: dto.status } : {}), ...(dto.assignedAdminId !== undefined ? { assignedAdminId: dto.assignedAdminId } : {}) }, include: inquiryInclude });
    }

    async addNote(id: string, note: string, adminId: string) {
        await this.get(id);
        return this.prisma.inquiryNote.create({ data: { inquiryId: id, adminId, note: note.trim() }, include: { admin: { select: { email: true } } } });
    }
}
