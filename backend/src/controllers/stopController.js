const prisma = require('../prisma');
const xlsx = require('xlsx');

const getAllStops = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const stops = await prisma.stop.findMany({
            where: schoolId ? { school_id: schoolId } : {},
            include: { route: true }
        });
        res.json(stops);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stops', error: error.message });
    }
};

const createStop = async (req, res) => {
    try {
        const { name, latitude, longitude, route_id, school_id, pickup_time, drop_time } = req.body;
        const newStop = await prisma.stop.create({
            data: {
                name,
                latitude: parseFloat(latitude) || 0,
                longitude: parseFloat(longitude) || 0,
                route_id,
                school_id
            }
        });
        res.status(201).json(newStop);
    } catch (error) {
        res.status(500).json({ message: 'Error creating stop', error: error.message });
    }
};

const bulkImportStops = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const { school_id } = req.body;
        if (!school_id) return res.status(400).json({ message: 'school_id is required' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const stops = data.map(item => ({
            name: item.name || item.Name || '',
            latitude: parseFloat(item.latitude || item.Lat || 0),
            longitude: parseFloat(item.longitude || item.Lng || 0),
            route_id: item.route_id || item.RouteID || '',
            school_id: school_id
        }));

        const createdStops = await prisma.stop.createMany({
            data: stops.filter(s => s.name && s.route_id)
        });

        res.status(201).json({ message: `Successfully imported ${createdStops.count} stops`, count: createdStops.count });
    } catch (error) {
        console.error('BULK IMPORT ERROR:', error);
        res.status(500).json({ message: 'Bulk import failed', error: error.message });
    }
};

const deleteStop = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.stop.delete({ where: { id } });
        res.json({ message: 'Stop deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting stop', error: error.message });
    }
};

module.exports = {
    getAllStops,
    createStop,
    bulkImportStops,
    deleteStop
};
