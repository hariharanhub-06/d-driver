const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding D-Driver test data...');
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const driverPassword = await bcrypt.hash('driver123', 10);
        const parentPassword = await bcrypt.hash('parent123', 10);

        // 1. Create School
        const school = await prisma.school.create({
            data: {
                name: 'Greenwood International School',
                address: '123 Education Lane, Cityville',
            }
        });
        console.log('✔ Created school:', school.name);

        // 2. Create Super Admin
        await prisma.user.create({
            data: {
                name: 'System Admin',
                email: 'superadmin@d-driver.com',
                password: hashedPassword,
                role: 'super_admin'
            }
        });
        console.log('✔ Created Super Admin: superadmin@d-driver.com / admin123');

        // 3. Create School Admin
        await prisma.user.create({
            data: {
                name: 'Green Admin',
                email: 'admin@greenwood.com',
                password: hashedPassword,
                role: 'admin',
                school_id: school.id
            }
        });
        console.log('✔ Created School Admin: admin@greenwood.com / admin123');

        // 4. Create Driver Account
        const driverUser = await prisma.user.create({
            data: {
                name: 'Sam Winston',
                email: 'driver@greenwood.com',
                password: driverPassword,
                role: 'driver',
                school_id: school.id
            }
        });
        await prisma.driver.create({
            data: {
                user_id: driverUser.id,
                school_id: school.id,
                license_no: 'DL-2024-5588'
            }
        });
        console.log('✔ Created Driver: driver@greenwood.com / driver123');

        // 5. Create Parent Account
        await prisma.user.create({
            data: {
                name: 'Mary Jane',
                email: 'parent@greenwood.com',
                password: parentPassword,
                role: 'parent',
                school_id: school.id
            }
        });
        console.log('✔ Created Parent: parent@greenwood.com / parent123');

        console.log('\n✨ Database seeding completed successfully!');
    } catch (err) {
        console.error('❌ Error during seeding:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
