const prisma = require('../prisma');

const getAllRoutes = async (req, res) => {
    try {
        const { getSchoolFilter } = require('../middleware/authMiddleware');
        const routes = await prisma.route.findMany({
            where: getSchoolFilter(req),
            include: {
                school: { select: { id: true, name: true } },
                stops: { orderBy: { sequence: 'asc' } },
                bus: { select: { id: true, bus_number: true, registration_no: true } },
            },
        });
        res.json(routes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching routes', details: error.message });
    }
};

const getRouteById = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.role === 'super_admin' ? undefined : req.user.school_id;
        const route = await prisma.route.findUnique({
            where: { id },
            include: {
                school: { select: { id: true, name: true } },
                stops: { orderBy: { sequence: 'asc' } },
                bus: { select: { id: true, bus_number: true, registration_no: true } },
                students: {
                    select: { id: true, name: true, photo_url: true, grade: true, stop_id: true },
                },
            },
        });
        if (!route) return res.status(404).json({ error: 'Route not found' });
        if (schoolId && route.school_id !== schoolId) return res.status(403).json({ error: 'Access denied' });
        res.json(route);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching route', details: error.message });
    }
};

const createRoute = async (req, res) => {
    try {
        const { name, school_id, start_point, end_point, bus_id, route_type, is_active } = req.body;
        const effectiveSchoolId = req.user.role === 'super_admin' ? school_id : req.user.school_id;
        const newRoute = await prisma.route.create({
            data: {
                name,
                school_id: effectiveSchoolId,
                start_point,
                end_point,
                bus_id: bus_id || null,
                route_type: route_type || 'morning',
                is_active: is_active !== undefined ? is_active : true,
            },
        });
        res.status(201).json(newRoute);
    } catch (error) {
        res.status(500).json({ error: 'Error creating route', details: error.message });
    }
};

const updateRoute = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.role === 'super_admin' ? undefined : req.user.school_id;
        if (schoolId) {
            const existing = await prisma.route.findUnique({ where: { id }, select: { school_id: true } });
            if (!existing) return res.status(404).json({ error: 'Route not found' });
            if (existing.school_id !== schoolId) return res.status(403).json({ error: 'Access denied' });
        }
        const { name, start_point, end_point, bus_id, route_type, is_active } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (start_point !== undefined) data.start_point = start_point;
        if (end_point !== undefined) data.end_point = end_point;
        if (bus_id !== undefined) data.bus_id = bus_id || null;
        if (route_type !== undefined) data.route_type = route_type;
        if (is_active !== undefined) data.is_active = is_active;

        const updatedRoute = await prisma.route.update({ where: { id }, data });
        res.json(updatedRoute);
    } catch (error) {
        res.status(500).json({ error: 'Error updating route', details: error.message });
    }
};

const deleteRoute = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.role === 'super_admin' ? undefined : req.user.school_id;
        if (schoolId) {
            const existing = await prisma.route.findUnique({ where: { id }, select: { school_id: true } });
            if (!existing) return res.status(404).json({ error: 'Route not found' });
            if (existing.school_id !== schoolId) return res.status(403).json({ error: 'Access denied' });
        }
        await prisma.route.delete({ where: { id } });
        res.json({ message: 'Route deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting route', details: error.message });
    }
};

// GET /routes/:id/stops — route with stops ordered by sequence
const getRouteWithStops = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.role === 'super_admin' ? undefined : req.user.school_id;
        const route = await prisma.route.findUnique({
            where: { id },
            include: {
                stops: { orderBy: { sequence: 'asc' } },
                bus: { select: { id: true, bus_number: true, registration_no: true } },
                school: { select: { id: true, name: true } },
            },
        });
        if (!route) return res.status(404).json({ error: 'Route not found' });
        if (schoolId && route.school_id !== schoolId) return res.status(403).json({ error: 'Access denied' });
        res.json(route);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching route stops', details: error.message });
    }
};

// POST /routes/bulk — bulk create routes
const bulkCreateRoutes = async (req, res) => {
    const { routes } = req.body;
    if (!Array.isArray(routes) || routes.length === 0) {
        return res.status(400).json({ error: 'routes array is required' });
    }

    const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
    if (!schoolId) return res.status(400).json({ error: 'school_id is required' });

    try {
        const created = [];
        const errors = [];

        for (const row of routes) {
            const { name, start_point, end_point, bus_id, route_type, is_active } = row;
            if (!name) {
                errors.push({ row, error: 'name is required' });
                continue;
            }
            try {
                const route = await prisma.route.create({
                    data: {
                        name,
                        school_id: schoolId,
                        start_point: start_point || null,
                        end_point: end_point || null,
                        bus_id: bus_id || null,
                        route_type: route_type || 'morning',
                        is_active: is_active !== undefined ? is_active : true,
                    },
                });
                created.push(route);
            } catch (err) {
                errors.push({ row, error: err.message });
            }
        }

        res.status(201).json({ created: created.length, routes: created, errors });
    } catch (error) {
        res.status(500).json({ error: 'Bulk route creation failed', details: error.message });
    }
};

module.exports = {
    getAllRoutes,
    createRoute,
    getRouteById,
    updateRoute,
    deleteRoute,
    getRouteWithStops,
    bulkCreateRoutes,
};
