const prisma = require('../prisma');

const getAllBuses = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const buses = await prisma.bus.findMany({
            where: schoolId ? { school_id: schoolId } : {}
        });
        res.json(buses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching buses', error: error.message });
    }
};

const getBusById = async (req, res) => {
    try {
        const { id } = req.params;
        const bus = await prisma.bus.findUnique({
            where: { id },
            include: { drivers: true }
        });
        if (!bus) return res.status(404).json({ message: 'Bus not found' });
        res.json(bus);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bus', error: error.message });
    }
};

const createBus = async (req, res) => {
    try {
        const { bus_number, capacity, school_id } = req.body;
        const newBus = await prisma.bus.create({
            data: { bus_number, capacity, school_id }
        });
        res.status(201).json(newBus);
    } catch (error) {
        res.status(500).json({ message: 'Error creating bus', error: error.message });
    }
};

const updateBus = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedBus = await prisma.bus.update({
            where: { id },
            data: req.body
        });
        res.json(updatedBus);
    } catch (error) {
        res.status(500).json({ message: 'Error updating bus', error: error.message });
    }
};

const deleteBus = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.bus.delete({ where: { id } });
        res.json({ message: 'Bus deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting bus', error: error.message });
    }
};

module.exports = {
    getAllBuses,
    createBus,
    getBusById,
    updateBus,
    deleteBus
};
