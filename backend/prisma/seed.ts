import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

process.env.DATABASE_URL = "mongodb+srv://hariharanjeyaramamoorthy_db_user:%40Bb26614@d-driver.qteaqiw.mongodb.net/d_driver?retryWrites=true&w=majority";

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const hashedPassword = await bcrypt.hash('admin@123', 10);

    // 1. Create Super Admin ONLY
    await prisma.user.upsert({
        where: { email: 'developer@ddriver.com' },
        update: {
            password: hashedPassword,
        },
        create: {
            email: 'developer@ddriver.com',
            password: hashedPassword,
            name: 'System Super Admin',
            role: 'super_admin',
        },
    });

    console.log('Database seeded with Super Admin (developer@ddriver.com) ONLY! Clean slate ready for app operations.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
