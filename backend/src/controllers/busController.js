const prisma = require('../prisma');
const { logAction } = require('../utils/auditLog');

const getAllBuses = async (req, res) => {
    try {
        let schoolId;
        if (req.user.role === 'super_admin') {
            schoolId = req.query.school_id || undefined;
        } else {
            schoolId = req.user.school_id;
        }

        const buses = await prisma.bus.findMany({
            where: schoolId ? { school_id: schoolId } : {},
            include: {
                drivers: {
                    include: {
                        user: { select: { name: true } },
                    },
                },
                routes: { select: { id: true, name: true } },
            },
        });

        res.json(buses);
    } catch (error) {
        console.error('getAllBuses error:', error);
        res.status(500).json({ error: 'Error fetching buses' });
    }
};

const getBusById = async (req, res) => {
    try {
        const { id } = req.params;

        const bus = await prisma.bus.findUnique({
            where: { id },
            include: {
                drivers: {
                    include: {
                        user: { select: { name: true, phone: true } },
                    },
                },
                routes: { select: { id: true, name: true } },
            },
        });

        if (!bus) return res.status(404).json({ error: 'Bus not found' });

        res.json(bus);
    } catch (error) {
        console.error('getBusById error:', error);
        res.status(500).json({ error: 'Error fetching bus' });
    }
};

const createBus = async (req, res) => {
    try {
        const { bus_number, capacity, registration_no, mileage, initial_fuel_liters, school_id } = req.body;
        const schoolId = req.user.role === 'super_admin' ? (school_id || req.query.school_id) : req.user.school_id;

        const parsedInitialFuel = initial_fuel_liters ? parseFloat(initial_fuel_liters) : 0;

        const newBus = await prisma.bus.create({
            data: {
                bus_number,
                capacity: parseInt(capacity),
                school_id: schoolId,
                registration_no: registration_no || null,
                mileage: mileage ? parseFloat(mileage) : null,
                initial_fuel_liters: parsedInitialFuel,
                fuel_liters: parsedInitialFuel,
            },
        });

        await logAction({ req, action: 'create_bus', targetType: 'bus', targetId: newBus.id });
        res.status(201).json(newBus);
    } catch (error) {
        console.error('createBus error:', error);
        res.status(500).json({ error: 'Error creating bus' });
    }
};

const updateBus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            bus_number,
            capacity,
            registration_no,
            mileage,
            fuel_liters,
            initial_fuel_liters,
        } = req.body;

        const data = {};
        if (bus_number !== undefined) data.bus_number = bus_number;
        if (capacity !== undefined) data.capacity = parseInt(capacity);
        if (registration_no !== undefined) data.registration_no = registration_no;
        if (mileage !== undefined) data.mileage = parseFloat(mileage);
        if (fuel_liters !== undefined) data.fuel_liters = parseFloat(fuel_liters);
        if (initial_fuel_liters !== undefined) data.initial_fuel_liters = parseFloat(initial_fuel_liters);

        const updatedBus = await prisma.bus.update({
            where: { id },
            data,
        });

        await logAction({ req, action: 'update_bus', targetType: 'bus', targetId: id });
        res.json(updatedBus);
    } catch (error) {
        console.error('updateBus error:', error);
        res.status(500).json({ error: 'Error updating bus' });
    }
};

const deleteBus = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.bus.delete({ where: { id } });
        await logAction({ req, action: 'delete_bus', targetType: 'bus', targetId: id });
        res.json({ deleted: true });
    } catch (error) {
        console.error('deleteBus error:', error);
        res.status(500).json({ error: 'Error deleting bus' });
    }
};

const bulkCreateBuses = async (req, res) => {
    try {
        const { buses } = req.body;
        const schoolId = req.user.school_id;

        if (!Array.isArray(buses) || buses.length === 0) {
            return res.status(400).json({ error: 'buses array is required' });
        }

        const created = [];
        const errors = [];

        for (const busData of buses) {
            try {
                const bus = await prisma.bus.create({
                    data: {
                        bus_number: busData.bus_number,
                        capacity: parseInt(busData.capacity),
                        school_id: schoolId,
                        registration_no: busData.registration_no || null,
                        mileage: busData.mileage ? parseFloat(busData.mileage) : null,
                        fuel_liters: 0,
                    },
                });
                created.push(bus);
            } catch (err) {
                errors.push({ bus_number: busData.bus_number, error: err.message });
            }
        }

        res.status(201).json({ created, errors });
    } catch (error) {
        console.error('bulkCreateBuses error:', error);
        res.status(500).json({ error: 'Error bulk creating buses' });
    }
};

module.exports = {
    getAllBuses,
    getBusById,
    createBus,
    updateBus,
    deleteBus,
    bulkCreateBuses,
};
