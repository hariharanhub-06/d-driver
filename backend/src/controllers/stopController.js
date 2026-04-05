const prisma = require('../prisma');
const xlsx = require('xlsx');

const getAllStops = async (req, res) => {
    try {
        const { schoolId, school_id } = req.query;
        const targetSchoolId = schoolId || school_id;
        const stops = await prisma.stop.findMany({
            where: targetSchoolId ? { school_id: targetSchoolId } : {},
            include: { route: true }
        });
        res.json(stops);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stops', error: error.message });
    }
};

try {
    const { name, latitude, longitude, lat, lng, route_id, school_id } = req.body;
    const newStop = await prisma.stop.create({
        data: {
            name,
            latitude: parseFloat(latitude || lat || 0),
            longitude: parseFloat(longitude || lng || 0),
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

        const stops = data.map(item => {
            // Find Keys case-insensitively
            const findVal = (keys) => {
                const found = Object.keys(item).find(k => keys.includes(k.trim().toLowerCase()));
                return found ? item[found] : null;
            };

            return {
                name: findVal(['name', 'stop name', 'stopname', 'label']) || '',
                latitude: parseFloat(findVal(['latitude', 'lat', 'latitude (optional)', 'lat (optional)']) || 0),
                longitude: parseFloat(findVal(['longitude', 'lng', 'longitude (optional)', 'lng (optional)']) || 0),
                route_id: findVal(['route_id', 'route id', 'routeid', 'route']) || '',
                school_id: school_id
            };
        });

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
