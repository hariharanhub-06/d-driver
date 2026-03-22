import { PrismaClient } from '@prisma/client';
process.env.DATABASE_URL = "mongodb+srv://hariharanjeyaramamoorthy_db_user:%40Bb26614@d-driver.qteaqiw.mongodb.net/d_driver?retryWrites=true&w=majority";
const prisma = new PrismaClient();
export default prisma;
