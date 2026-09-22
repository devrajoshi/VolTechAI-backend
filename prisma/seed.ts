import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The service catalogue is imported by the versioned catalogue migration.
// Do not seed package prices here: admin edits are authoritative.

const testimonials = [
    {
        seedKey: 'homepage-sarah-johnson',
        name: 'Sarah Johnson',
        role: 'CEO',
        company: 'TechStart Solutions',
        quote: 'VolTechAI transformed our business operations. Their custom software solution increased our efficiency by 40% and provided insights we never had before.',
        imagePath: '/images/lady1.png',
        rating: 5,
        sortOrder: 1,
        isPublished: true,
    },
    {
        seedKey: 'homepage-michael-chen',
        name: 'Michael Chen',
        role: 'Marketing Director',
        company: 'GrowthBrand',
        quote: 'The digital marketing strategy they implemented exceeded our expectations. We saw a 200% increase in qualified leads within just three months.',
        imagePath: '/images/man.png',
        rating: 5,
        sortOrder: 2,
        isPublished: true,
    },
    {
        seedKey: 'homepage-emily-rodriguez',
        name: 'Emily Rodriguez',
        role: 'CTO',
        company: 'InnovateNow',
        quote: 'Their cybersecurity audit identified critical vulnerabilities we were not aware of. The remediation plan was clear, actionable, and effectively implemented.',
        imagePath: '/images/lady2.png',
        rating: 4,
        sortOrder: 3,
        isPublished: true,
    },
];

const faqs = [
    {
        seedKey: 'homepage-what-makes-voltechai-different',
        question: 'What makes VolTechAI different from other agencies?',
        answer: 'We combine cutting-edge technology with high-end, premium design aesthetics. Instead of using off-the-shelf templates, we engineer custom solutions specifically tailored to elevate your brand and drive measurable business results.',
        sortOrder: 1,
        isPublished: true,
    },
    {
        seedKey: 'homepage-how-long-project-take',
        question: 'How long does a typical project take?',
        answer: 'Project timelines vary based on complexity. A standard corporate website might take 4-6 weeks, while a custom web application or software platform can range from 3 to 6 months. We provide detailed timelines during the initial consultation.',
        sortOrder: 2,
        isPublished: true,
    },
    {
        seedKey: 'homepage-ongoing-support',
        question: 'Do you offer ongoing support after launch?',
        answer: 'Absolutely. We offer complete post-launch maintenance, security auditing, and feature enhancement packages. We believe in building long-term partnerships to ensure your platform grows with your business.',
        sortOrder: 3,
        isPublished: true,
    },
    {
        seedKey: 'homepage-pricing-structure',
        question: 'What is your pricing structure?',
        answer: 'Our pricing is project-based, tailored to the specific requirements and scope of your vision. After an initial discovery call, we provide a transparent, detailed proposal outlining all costs with no hidden fees.',
        sortOrder: 4,
        isPublished: true,
    },
];

async function main() {
    console.log('🌱 Seeding starter CMS content...');

    for (const testimonial of testimonials) {
        // Starter records must never overwrite CMS edits made by an administrator.
        await prisma.testimonial.upsert({ where: { seedKey: testimonial.seedKey }, update: {}, create: testimonial });
    }

    for (const faq of faqs) {
        // Starter records must never overwrite CMS edits made by an administrator.
        await prisma.faq.upsert({ where: { seedKey: faq.seedKey }, update: {}, create: faq });
    }

    console.log('✨ Seeding complete. Catalogue and published CMS starter content are ready.');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
