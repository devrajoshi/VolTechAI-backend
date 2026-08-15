import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Package } from '@prisma/client';

@Injectable()
export class PackagesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Fetches a single active package by its URL-friendly slug.
     * This is the authoritative source of pricing — never trust client-sent amounts.
     *
     * @throws NotFoundException if the package does not exist or is not active.
     */
    async findBySlug(slug: string): Promise<Package> {
        const pkg = await this.prisma.package.findFirst({
            where: {
                slug,
                isActive: true,
            },
        });

        if (!pkg) {
            throw new NotFoundException(`Package with slug "${slug}" not found or is no longer available.`);
        }

        return pkg;
    }

    /**
     * Returns all active packages. Useful for admin dashboards.
     */
    async findAll(): Promise<Package[]> {
        return this.prisma.package.findMany({
            where: { isActive: true },
            orderBy: { amount: 'asc' },
        });
    }
}
