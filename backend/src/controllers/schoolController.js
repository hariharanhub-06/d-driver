const prisma = require('../prisma');

const getAllSchools = async (req, res) => {
    try {
        const schools = await prisma.school.findMany();
        res.json(schools);
    } catch (error) {
        console.error('DATABASE ERROR (getAllSchools):', error);
        res.status(500).json({ message: 'Error fetching schools', error: error.message, stack: error.stack });
    }
};

const getSchoolBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const school = await prisma.school.findUnique({
            where: { slug },
            include: {
                buses: true,
                drivers: true,
                routes: true,
                students: true
            }
        });
        if (!school) return res.status(404).json({ message: 'School not found' });
        res.json(school);
    } catch (error) {
        console.error('DATABASE ERROR (getSchoolBySlug):', error);
        res.status(500).json({ message: 'Error fetching school', error: error.message, stack: error.stack });
    }
};

const registerSchool = async (req, res) => {
    try {
        const { name, slug, address, phone, email_contact, subscription_plan, logo_url, primary_color } = req.body;
        const newSchool = await prisma.school.create({
            data: { name, slug, address, phone, email_contact, subscription_plan, logo_url, primary_color }
        });
        res.status(201).json(newSchool);
    } catch (error) {
        console.error('DATABASE ERROR (registerSchool):', error);
        res.status(500).json({ message: 'Error creating school', error: error.message, stack: error.stack });
    }
};

const updateSchool = async (req, res) => {
    try {
        const { id } = req.params;

        // Define allowed scalar fields for update
        const allowedFields = [
            'name', 'slug', 'address', 'logo_url', 'primary_color',
            'phone', 'email_contact', 'subscription_plan', 'status', 'permissions'
        ];

        const updateData = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        const updatedSchool = await prisma.school.update({
            where: { id },
            data: updateData
        });
        res.json(updatedSchool);
    } catch (error) {
        console.error('DATABASE ERROR (updateSchool):', error);
        res.status(500).json({ message: 'Error updating school', error: error.message, stack: error.stack });
    }
};

const deleteSchool = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.school.delete({ where: { id } });
        res.json({ message: 'School deleted successfully' });
    } catch (error) {
        console.error('DATABASE ERROR (deleteSchool):', error);
        res.status(500).json({ message: 'Error deleting school', error: error.message, stack: error.stack });
    }
};

module.exports = {
    getAllSchools,
    registerSchool,
    getSchoolBySlug,
    updateSchool,
    deleteSchool
};
