import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

process.env.DATABASE_URL = "mongodb+srv://hariharanjeyaramamoorthy_db_user:%40Bb26614@d-driver.qteaqiw.mongodb.net/d_driver?retryWrites=true&w=majority";

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create a School
    const school = await prisma.school.upsert({
        where: { id: 'default-school-id' },
        update: {},
        create: {
            id: 'default-school-id',
            name: 'Greenwood International School',
            address: '123 Education Lane, Cityville',
            subscription_plan: 'premium',
            status: 'active',
        },
    });

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 2. Create School Admin
    await prisma.user.upsert({
        where: { email: 'admin@greenwood.com' },
        update: {},
        create: {
            email: 'admin@greenwood.com',
            password: hashedPassword,
            name: 'Principal Sarah',
            role: 'admin',
            school_id: school.id,
        },
    });

    // 3. Create a Bus
    const bus = await prisma.bus.create({
        data: {
            bus_number: 'BUS-001',
            capacity: 40,
            school_id: school.id,
        },
    });

    // 4. Create a Driver
    const driverUser = await prisma.user.create({
        data: {
            email: 'driver1@d-driver.com',
            password: hashedPassword,
            name: 'John Doe',
            role: 'driver',
            school_id: school.id,
        },
    });

    const driver = await prisma.driver.create({
        data: {
            user_id: driverUser.id,
            license_no: 'DL-12345678',
            assigned_bus_id: bus.id,
            school_id: school.id,
        },
    });

    // 5. Create a Route and Stop
    const route = await prisma.route.create({
        data: {
            name: 'Morning Route A',
            school_id: school.id,
        },
    });

    const stop = await prisma.stop.create({
        data: {
            name: 'Central Library',
            latitude: 12.9716,
            longitude: 77.5946,
            route_id: route.id,
            school_id: school.id,
        },
    });

    // 6. Create a Parent
    const parentUser = await prisma.user.create({
        data: {
            email: 'parent@home.com',
            password: hashedPassword,
            name: 'Robert Johnson',
            role: 'parent',
            school_id: school.id,
        },
    });

    // 7. Create a Student
    await prisma.student.create({
        data: {
            name: 'Alex Johnson',
            grade: '5th',
            section: 'A',
            parent_id: parentUser.id,
            route_id: route.id,
            stop_id: stop.id,
            school_id: school.id,
        },
    });

    console.log('Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
