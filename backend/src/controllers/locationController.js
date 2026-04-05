const prisma = require('../prisma');

const updateLocation = async (req, res) => {
    try {
        const { busId, latitude, longitude, schoolId } = req.body;
        const location = await prisma.location.create({
            data: {
                bus_id: busId,
                latitude,
                longitude,
                school_id: schoolId
            }
        });
        res.json(location);
    } catch (error) {
        res.status(500).json({ message: 'Error updating location', error: error.message });
    }
};

const getBusLocation = async (req, res) => {
    try {
        const { busId } = req.params;
        const location = await prisma.location.findFirst({
            where: { bus_id: busId },
            orderBy: { timestamp: 'desc' }
        });
        if (!location) return res.status(404).json({ message: 'Location not found' });
        res.json(location);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching location', error: error.message });
    }
};

module.exports = { updateLocation, getBusLocation };
