const prisma = require('../prisma');

const getAllRoutes = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const routes = await prisma.route.findMany({
            where: schoolId ? { school_id: schoolId } : {},
            include: { school: true, stops: true }
        });
        res.json(routes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching routes', error: error.message });
    }
};

const getRouteById = async (req, res) => {
    try {
        const { id } = req.params;
        const route = await prisma.route.findUnique({
            where: { id },
            include: { school: true, stops: true }
        });
        if (!route) return res.status(404).json({ message: 'Route not found' });
        res.json(route);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching route', error: error.message });
    }
};

const createRoute = async (req, res) => {
    try {
        const { name, school_id } = req.body;
        const newRoute = await prisma.route.create({
            data: { name, school_id }
        });
        res.status(201).json(newRoute);
    } catch (error) {
        res.status(500).json({ message: 'Error creating route', error: error.message });
    }
};

const updateRoute = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedRoute = await prisma.route.update({
            where: { id },
            data: req.body
        });
        res.json(updatedRoute);
    } catch (error) {
        res.status(500).json({ message: 'Error updating route', error: error.message });
    }
};

const deleteRoute = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.route.delete({ where: { id } });
        res.json({ message: 'Route deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting route', error: error.message });
    }
};

module.exports = {
    getAllRoutes,
    createRoute,
    getRouteById,
    updateRoute,
    deleteRoute
};
