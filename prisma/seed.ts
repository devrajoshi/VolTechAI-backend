import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const packages = [
    // 1. Website Design & Development
    { slug: 'website-get-online', name: 'Get Online', amount: 45000, currency: 'gbp' },
    { slug: 'website-grow-business', name: 'Grow Your Business', amount: 120000, currency: 'gbp' },
    { slug: 'website-full-business-platform', name: 'Full Business Platform', amount: 300000, currency: 'gbp' },

    // 2. Branding & Identity
    { slug: 'branding-look-professional', name: 'Look Professional', amount: 25000, currency: 'gbp' },
    { slug: 'branding-complete-brand-look', name: 'Complete Brand Look', amount: 70000, currency: 'gbp' },
    { slug: 'branding-brand-strategy', name: 'Brand Strategy', amount: 150000, currency: 'gbp' },

    // 3. Graphic Design for Business
    { slug: 'graphic-design-everyday-essentials', name: 'Everyday Essentials', amount: 20000, currency: 'gbp' },
    { slug: 'graphic-design-marketing-collateral', name: 'Marketing Collateral', amount: 45000, currency: 'gbp' },
    // graphic-design-full-design-support is recurring (not yet seeded as DB package)

    // 4. Digital Marketing & SEO
    { slug: 'marketing-get-found', name: 'Get Found', amount: 30000, currency: 'gbp' },
    // others recurring or POA

    // 5. AI Services
    { slug: 'ai-readiness-strategy', name: 'AI Readiness & Strategy', amount: 40000, currency: 'gbp' },
    { slug: 'ai-powered-automation', name: 'AI-Powered Automation', amount: 90000, currency: 'gbp' },
    { slug: 'ai-custom-secure-integration', name: 'Custom AI & Secure Integration', amount: 250000, currency: 'gbp' },

    // 6. Cybersecurity Services
    { slug: 'cybersecurity-health-check', name: 'Health Check', amount: 35000, currency: 'gbp' },
    { slug: 'cybersecurity-stay-protected', name: 'Stay Protected', amount: 90000, currency: 'gbp' },

    // 7. Governance, Risk & Compliance (GRC)
    { slug: 'grc-am-i-compliant', name: 'Am I Compliant?', amount: 40000, currency: 'gbp' },
    { slug: 'grc-get-compliant', name: 'Get Compliant', amount: 110000, currency: 'gbp' },
];

async function main() {
    console.log('🌱 Seeding real VolTechAI package catalogue...');

    // Optionally cleanup old mock items
    await prisma.package.deleteMany({
        where: {
            slug: { in: ['tech-launch', 'seo-boost', 'design-pro'] }
        }
    });

    for (const pkg of packages) {
        const result = await prisma.package.upsert({
            where: { slug: pkg.slug },
            update: { name: pkg.name, amount: pkg.amount, currency: pkg.currency },
            create: pkg,
        });
        console.log(`  ✅ Upserted package (one_time purchasable): ${result.slug} (${result.name} - £${(result.amount / 100).toFixed(2)})`);
    }

    console.log('✨ Seeding complete. Frontend will now correctly find these package IDs for direct checkout!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
