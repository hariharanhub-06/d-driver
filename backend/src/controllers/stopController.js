const prisma = require('../prisma');
const xlsx = require('xlsx');

const getAllStops = async (req, res) => {
    try {
        const schoolId = req.schoolId || (req.user.role === 'super_admin' ? req.query.school_id : req.user.school_id);
        const routeId = req.query.route_id || null;
        const where = {};
        if (schoolId) where.school_id = schoolId;
        if (routeId) where.route_id = routeId;
        const stops = await prisma.stop.findMany({
            where,
            include: {
                route: { select: { id: true, name: true, route_type: true } },
                school: { select: { primary_color: true } },
            },
            orderBy: [{ route_id: 'asc' }, { sequence: 'asc' }],
        });
        res.json(stops);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching stops', details: error.message });
    }
};

const createStop = async (req, res) => {
    try {
        const { name, latitude, longitude, lat, lng, route_id, school_id, sequence, pickup_time, drop_time, trip_type } = req.body;
        const effectiveSchoolId = req.user.role === 'super_admin' ? school_id : req.user.school_id;
        const newStop = await prisma.stop.create({
            data: {
                name,
                latitude: parseFloat(latitude || lat || 0),
                longitude: parseFloat(longitude || lng || 0),
                route_id,
                school_id: effectiveSchoolId,
                sequence: sequence !== undefined ? parseInt(sequence) : 0,
                pickup_time: pickup_time || null,
                drop_time: drop_time || null,
                trip_type: trip_type || 'morning',
            },
        });
        res.status(201).json(newStop);
    } catch (error) {
        res.status(500).json({ error: 'Error creating stop', details: error.message });
    }
};

const updateStop = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.role === 'super_admin' ? undefined : req.user.school_id;
        if (schoolId) {
            const existing = await prisma.stop.findUnique({ where: { id }, select: { school_id: true } });
            if (!existing) return res.status(404).json({ error: 'Stop not found' });
            if (existing.school_id !== schoolId) return res.status(403).json({ error: 'Access denied' });
        }

        const { name, latitude, longitude, lat, lng, route_id, sequence, pickup_time, drop_time, trip_type } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (latitude !== undefined || lat !== undefined) data.latitude = parseFloat(latitude || lat);
        if (longitude !== undefined || lng !== undefined) data.longitude = parseFloat(longitude || lng);
        if (route_id !== undefined) data.route_id = route_id;
        if (sequence !== undefined) data.sequence = parseInt(sequence);
        if (pickup_time !== undefined) data.pickup_time = pickup_time || null;
        if (drop_time !== undefined) data.drop_time = drop_time || null;
        if (trip_type !== undefined) data.trip_type = trip_type;

        const updated = await prisma.stop.update({ where: { id }, data });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Error updating stop', details: error.message });
    }
};

// POST /stops/bulk — JSON body bulk create
const bulkCreateStops = async (req, res) => {
    try {
        const { stops } = req.body;
        if (!Array.isArray(stops) || stops.length === 0) {
            return res.status(400).json({ error: 'stops array is required' });
        }

        const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
        if (!schoolId) return res.status(400).json({ error: 'school_id is required' });

        const created = [];
        const errors = [];

        for (const row of stops) {
            const { name, route_id, latitude, longitude, lat, lng, sequence, pickup_time, drop_time } = row;
            if (!name || !route_id) {
                errors.push({ row, error: 'name and route_id are required' });
                continue;
            }
            try {
                const stop = await prisma.stop.create({
                    data: {
                        name,
                        route_id,
                        school_id: schoolId,
                        latitude: parseFloat(latitude || lat || 0),
                        longitude: parseFloat(longitude || lng || 0),
                        sequence: sequence !== undefined ? parseInt(sequence) : 0,
                        pickup_time: pickup_time || null,
                        drop_time: drop_time || null,
                    },
                });
                created.push(stop);
            } catch (err) {
                errors.push({ row, error: err.message });
            }
        }

        res.status(201).json({ created: created.length, stops: created, errors });
    } catch (error) {
        res.status(500).json({ error: 'Error bulk creating stops', details: error.message });
    }
};

// POST /stops/bulk-import — xlsx file upload
const bulkImportStops = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const { school_id } = req.body;
        if (!school_id) return res.status(400).json({ error: 'school_id is required' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const stops = data.map(item => {
            const findVal = (keys) => {
                const found = Object.keys(item).find(k => keys.includes(k.trim().toLowerCase()));
                return found ? item[found] : null;
            };
            return {
                name: findVal(['name', 'stop name', 'stopname', 'label']) || '',
                latitude: parseFloat(findVal(['latitude', 'lat', 'latitude (optional)', 'lat (optional)']) || 0),
                longitude: parseFloat(findVal(['longitude', 'lng', 'longitude (optional)', 'lng (optional)']) || 0),
                route_id: findVal(['route_id', 'route id', 'routeid', 'route']) || '',
                school_id,
                sequence: parseInt(findVal(['sequence', 'seq', 'order']) || 0),
                pickup_time: findVal(['pickup_time', 'pickup time', 'pickup']) || null,
                drop_time: findVal(['drop_time', 'drop time', 'drop']) || null,
            };
        });

        const createdStops = await prisma.stop.createMany({
            data: stops.filter(s => s.name && s.route_id),
        });

        res.status(201).json({ message: `Successfully imported ${createdStops.count} stops`, count: createdStops.count });
    } catch (error) {
        console.error('BULK IMPORT ERROR:', error);
        res.status(500).json({ error: 'Bulk import failed', details: error.message });
    }
};

const deleteStop = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.role === 'super_admin' ? undefined : req.user.school_id;
        if (schoolId) {
            const existing = await prisma.stop.findUnique({ where: { id }, select: { school_id: true } });
            if (!existing) return res.status(404).json({ error: 'Stop not found' });
            if (existing.school_id !== schoolId) return res.status(403).json({ error: 'Access denied' });
        }
        await prisma.stop.delete({ where: { id } });
        res.json({ message: 'Stop deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting stop', details: error.message });
    }
};

const getNearbyStops = async (req, res) => {
    try {
        const { lat, lng, radius = 2000 } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });
        const schoolId = req.user.school_id;
        const { distanceMeters } = require('../utils/haversine');
        const stops = await prisma.stop.findMany({
            where: { route: { school_id: schoolId } },
            include: { route: { select: { name: true, route_type: true } } },
        });
        const nearby = stops
            .map(s => ({ ...s, distance: distanceMeters(parseFloat(lat), parseFloat(lng), s.latitude, s.longitude) }))
            .filter(s => s.distance <= parseInt(radius))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10);
        res.json(nearby);
    } catch (err) {
        console.error('getNearbyStops error:', err);
        res.status(500).json({ error: 'Error finding nearby stops' });
    }
};

module.exports = {
    getAllStops,
    createStop,
    updateStop,
    bulkCreateStops,
    bulkImportStops,
    deleteStop,
    getNearbyStops,
};
