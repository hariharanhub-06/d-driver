const prisma = require('../prisma');

const getAllDrivers = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const drivers = await prisma.driver.findMany({
            where: schoolId ? { school_id: schoolId } : {},
            include: { user: true, bus: true }
        });
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching drivers', error: error.message });
    }
};

const getDriverById = async (req, res) => {
    try {
        const { id } = req.params;
        const driver = await prisma.driver.findUnique({
            where: { id },
            include: { user: true, bus: true }
        });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        res.json(driver);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching driver', error: error.message });
    }
};

const createDriver = async (req, res) => {
    try {
        const { user_id, license_no, assigned_bus_id, school_id } = req.body;
        const newDriver = await prisma.driver.create({
            data: { user_id, license_no, assigned_bus_id, school_id }
        });
        res.status(201).json(newDriver);
    } catch (error) {
        res.status(500).json({ message: 'Error creating driver', error: error.message });
    }
};

const updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedDriver = await prisma.driver.update({
            where: { id },
            data: req.body
        });
        res.json(updatedDriver);
    } catch (error) {
        res.status(500).json({ message: 'Error updating driver', error: error.message });
    }
};

const deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.driver.delete({ where: { id } });
        res.json({ message: 'Driver deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting driver', error: error.message });
    }
};

module.exports = {
    getAllDrivers,
    createDriver,
    getDriverById,
    updateDriver,
    deleteDriver
};
