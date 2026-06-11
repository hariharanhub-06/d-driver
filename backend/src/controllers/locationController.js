const prisma = require('../prisma');
const { distanceMeters } = require('../utils/haversine');

// In-memory map tracking proximity/arrival alerts per (tripId:stopId:type).
// Types: "approaching" (1 km), "arrived" (100 m).
// Entries older than 2 hours are purged so alerts can re-fire on the next trip the same day.
const alertedStops = new Map();
const ALERT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const updateLocation = async (req, res) => {
    try {
        const { latitude, longitude, heading } = req.body;
        const userId = req.user.id;
        const schoolId = req.user.school_id;

        const driver = await prisma.driver.findFirst({
            where: { user_id: userId },
        });
        if (!driver || !driver.assigned_bus_id) {
            return res.status(400).json({ error: 'No bus assigned to this driver' });
        }
        const busId = driver.assigned_bus_id;

        // Deduct fuel based on distance since last ping
        try {
            const prevLocation = await prisma.location.findFirst({
                where: { bus_id: busId },
                orderBy: { timestamp: 'desc' },
            });
            const bus = await prisma.bus.findUnique({ where: { id: busId }, select: { mileage: true, fuel_liters: true } });
            if (prevLocation && bus?.mileage && bus.mileage > 0 && bus.fuel_liters !== null) {
                const distKm = distanceMeters(
                    parseFloat(latitude), parseFloat(longitude),
                    prevLocation.latitude, prevLocation.longitude
                ) / 1000;
                if (distKm > 0.01) { // ignore micro-movements < 10 m
                    const fuelUsed = distKm / bus.mileage;
                    const newFuel = Math.max(0, bus.fuel_liters - fuelUsed);
                    await prisma.bus.update({ where: { id: busId }, data: { fuel_liters: newFuel } });
                }
            }
        } catch { /* non-critical — don't block location update */ }

        const location = await prisma.location.create({
            data: {
                bus_id: busId,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                school_id: schoolId,
                ...(heading !== undefined && { heading: parseFloat(heading) }),
            },
        });

        const io = req.app.get('io');
        io.to(`school-${schoolId}`).emit('location-updated', {
            busId,
            latitude: location.latitude,
            longitude: location.longitude,
            heading: location.heading ?? null,
            timestamp: location.timestamp,
        });

        // Proximity check — find running active trip for this bus
        const activeTrip = await prisma.activeTrip.findFirst({
            where: { bus_id: busId, status: 'running' },
            include: {
                route: {
                    include: { stops: { orderBy: { sequence: 'asc' } } },
                },
            },
        });

        if (activeTrip) {
            const stops = activeTrip.route.stops;
            const remainingStops = stops.filter(
                (s) => s.sequence >= activeTrip.current_stop_index
            );

            for (const stop of remainingStops) {
                const dist = distanceMeters(
                    parseFloat(latitude),
                    parseFloat(longitude),
                    stop.latitude,
                    stop.longitude
                );

                // Fetch students at this stop once (reused for both proximity levels)
                const approachingKey = `${activeTrip.id}:${stop.id}:approaching`;
                const arrivedKey    = `${activeTrip.id}:${stop.id}:arrived`;

                const shouldApproach = dist <= 1000 && !(alertedStops.get(approachingKey) && Date.now() - alertedStops.get(approachingKey) < ALERT_TTL_MS);
                const shouldArrived  = dist <= 100  && !(alertedStops.get(arrivedKey)     && Date.now() - alertedStops.get(arrivedKey)     < ALERT_TTL_MS);

                if (!shouldApproach && !shouldArrived) continue;

                const students = await prisma.student.findMany({
                    where: { stop_id: stop.id, school_id: schoolId },
                    select: { parent_id: true, name: true },
                });

                // Group by parent_id — one notification per parent
                const parentMap = new Map();
                for (const s of students) {
                    if (!s.parent_id) continue;
                    if (!parentMap.has(s.parent_id)) parentMap.set(s.parent_id, []);
                    parentMap.get(s.parent_id).push(s.name);
                }

                if (shouldApproach) {
                    alertedStops.set(approachingKey, Date.now());
                    for (const [parentId, names] of parentMap) {
                        const nameStr = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
                        const notification = await prisma.notification.create({
                            data: {
                                user_id: parentId,
                                school_id: schoolId,
                                type: 'alert',
                                message: `Bus is 1 km away from ${stop.name}. ${nameStr} — please be ready!`,
                            },
                        });
                        io.to(`parent-${parentId}`).emit('bus-approaching', {
                            stopName: stop.name,
                            studentNames: names,
                            distanceKm: (dist / 1000).toFixed(1),
                            notification,
                        });
                    }
                }

                if (shouldArrived) {
                    alertedStops.set(arrivedKey, Date.now());
                    for (const [parentId, names] of parentMap) {
                        const nameStr = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
                        const notification = await prisma.notification.create({
                            data: {
                                user_id: parentId,
                                school_id: schoolId,
                                type: 'info',
                                message: `Bus has arrived at ${stop.name} to pick up ${nameStr}.`,
                            },
                        });
                        io.to(`parent-${parentId}`).emit('bus-arrived-stop', {
                            stopName: stop.name,
                            studentNames: names,
                            notification,
                        });
                    }
                }
            }
        }

        // Fuel estimation check
        try {
            const bus = await prisma.bus.findUnique({ where: { id: busId } });
            if (
                bus &&
                bus.mileage &&
                bus.fuel_liters !== null &&
                bus.last_fuel_km !== null &&
                bus.total_km_run !== null
            ) {
                const kmSinceLastFuel = bus.total_km_run - bus.last_fuel_km;
                const estimatedFuelUsed = kmSinceLastFuel / bus.mileage;
                const estimatedRemaining = bus.fuel_liters - estimatedFuelUsed;

                if (estimatedRemaining < 5) {
                    const today = new Date();
                    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const endOfDay = new Date(startOfDay.getTime() + 86400000);

                    const existingAlert = await prisma.notification.findFirst({
                        where: {
                            school_id: schoolId,
                            type: 'alert',
                            message: { contains: `fuel alert for bus ${bus.bus_number}` },
                            created_at: { gte: startOfDay, lt: endOfDay },
                        },
                    });

                    if (!existingAlert) {
                        const adminUser = await prisma.user.findFirst({
                            where: { school_id: schoolId, role: 'admin', is_active: true },
                            select: { id: true },
                        });
                        if (!adminUser) return;

                        const fuelNotification = await prisma.notification.create({
                            data: {
                                user_id: adminUser.id,
                                school_id: schoolId,
                                type: 'alert',
                                message: `Low fuel alert for bus ${bus.bus_number}. Estimated remaining: ${estimatedRemaining.toFixed(1)}L.`,
                            },
                        });

                        io.to(`admin-${schoolId}`).emit('fuel-alert', {
                            busId,
                            busNumber: bus.bus_number,
                            estimatedRemaining: estimatedRemaining.toFixed(1),
                            notification: fuelNotification,
                        });
                    }
                }
            }
        } catch (fuelErr) {
            console.error('Fuel estimation error:', fuelErr);
        }

        res.json(location);
    } catch (error) {
        console.error('updateLocation error:', error);
        res.status(500).json({ error: 'Error updating location' });
    }
};

const getBusLocation = async (req, res) => {
    try {
        const { busId } = req.params;
        const location = await prisma.location.findFirst({
            where: { bus_id: busId },
            orderBy: { timestamp: 'desc' },
        });
        if (!location) return res.status(404).json({ error: 'Location not found' });
        res.json(location);
    } catch (error) {
        console.error('getBusLocation error:', error);
        res.status(500).json({ error: 'Error fetching location' });
    }
};

const getAllActiveBusLocations = async (req, res) => {
    try {
        const schoolId = req.user.role === 'super_admin'
            ? req.query.school_id
            : req.user.school_id;

        const whereClause = { status: 'running' };
        if (schoolId) {
            whereClause.school_id = schoolId;
        } else if (req.user.role === 'super_admin' && !req.user.is_dev_sa) {
            // Regular SA: scope to schools they are assigned to
            whereClause.school = { assigned_sa_id: req.user.id };
        }

        const activeTrips = await prisma.activeTrip.findMany({
            where: whereClause,
            select: {
                bus_id: true, id: true, route_id: true, school_id: true,
                bus: { select: { bus_number: true } },
                route: { select: { name: true } },
                driver: { include: { user: { select: { name: true } } } },
                school: { select: { name: true, primary_color: true } },
            },
        });

        const results = await Promise.all(
            activeTrips.map(async (trip) => {
                const location = await prisma.location.findFirst({
                    where: { bus_id: trip.bus_id },
                    orderBy: { timestamp: 'desc' },
                });
                return {
                    tripId: trip.id,
                    bus_id: trip.bus_id,
                    bus_number: trip.bus?.bus_number || null,
                    route_name: trip.route?.name || null,
                    driver_name: trip.driver?.user?.name || null,
                    school_id: trip.school_id,
                    school_name: trip.school?.name || null,
                    school_color: trip.school?.primary_color || null,
                    routeId: trip.route_id,
                    location,
                };
            })
        );

        res.json(results.filter((r) => r.location !== null));
    } catch (error) {
        console.error('getAllActiveBusLocations error:', error);
        res.status(500).json({ error: 'Error fetching active bus locations' });
    }
};

module.exports = { updateLocation, getBusLocation, getAllActiveBusLocations };
