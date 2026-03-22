const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding one test school...');
    try {
        const school = await prisma.school.create({
            data: {
                name: 'Greenwood International School',
                address: '123 Education Lane, Cityville',
            }
        });
        console.log('Created school:', school.id);
    } catch (err) {
        console.error('Error seeding:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
