import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@Injectable()
export class ContentService {
    constructor(private readonly prisma: PrismaService) {}

    findPublishedTestimonials() {
        return this.prisma.testimonial.findMany({
            where: { isPublished: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
                id: true,
                name: true,
                role: true,
                company: true,
                quote: true,
                rating: true,
                imagePath: true,
                sortOrder: true,
            },
        });
    }

    findPublishedFaqs() {
        return this.prisma.faq.findMany({
            where: { isPublished: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
                id: true,
                question: true,
                answer: true,
                category: true,
                sortOrder: true,
            },
        });
    }

    findAdminTestimonials() {
        return this.prisma.testimonial.findMany({
            orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        });
    }

    async findAdminTestimonial(id: string) {
        const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
        if (!testimonial) {
            throw new NotFoundException('Testimonial not found.');
        }
        return testimonial;
    }

    createTestimonial(dto: CreateTestimonialDto, adminId: string) {
        return this.prisma.testimonial.create({
            data: {
                ...dto,
                createdById: adminId,
                updatedById: adminId,
            },
        });
    }

    async updateTestimonial(id: string, dto: UpdateTestimonialDto, adminId: string) {
        await this.findAdminTestimonial(id);
        return this.prisma.testimonial.update({
            where: { id },
            data: { ...dto, updatedById: adminId },
        });
    }

    async deleteTestimonial(id: string) {
        await this.findAdminTestimonial(id);
        await this.prisma.testimonial.delete({ where: { id } });
    }

    findAdminFaqs() {
        return this.prisma.faq.findMany({
            orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        });
    }

    async findAdminFaq(id: string) {
        const faq = await this.prisma.faq.findUnique({ where: { id } });
        if (!faq) {
            throw new NotFoundException('FAQ not found.');
        }
        return faq;
    }

    createFaq(dto: CreateFaqDto, adminId: string) {
        return this.prisma.faq.create({
            data: {
                ...dto,
                createdById: adminId,
                updatedById: adminId,
            },
        });
    }

    async updateFaq(id: string, dto: UpdateFaqDto, adminId: string) {
        await this.findAdminFaq(id);
        return this.prisma.faq.update({
            where: { id },
            data: { ...dto, updatedById: adminId },
        });
    }

    async deleteFaq(id: string) {
        await this.findAdminFaq(id);
        await this.prisma.faq.delete({ where: { id } });
    }
}
