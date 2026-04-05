import { Request, Response } from 'express';
import prisma from '../prisma';

// Mock school data for development failover (In-memory persistence)
let SESSION_MOCK_SCHOOLS = [
    {
        id: 'default-school-id',
        name: 'Greenwood International School',
        slug: 'greenwood',
        address: '123 Education Lane, Cityville',
        subscription_plan: 'Premium',
        status: 'Active',
        logo_url: 'https://img.icons8.com/color/96/school.png',
        primary_color: '#2dbc75',
        permissions: { 'f1': true, 'f4': true, 'f5': true, 'f6': true, 'f7': true, 'f8': true, 'f9': true, 'f10': true },
        buses: [
            { id: 'b1', bus_number: 'B-101', capacity: 40 },
            { id: 'b2', bus_number: 'B-102', capacity: 35 }
        ],
        drivers: [
            { id: 'd1', name: 'John Driver', license: 'ABC-123', assigned_bus: 'B-101' },
            { id: 'd2', name: 'Jane Driver', license: 'XYZ-789', assigned_bus: 'B-102' }
        ],
        routes: [
            {
                id: 'r1', name: 'North Loop', stops: [
                    { id: 'st1', name: 'West Gate', time: '07:30', lat: 12.9716, lng: 77.5946 },
                    { id: 'st2', name: 'Main St', time: '07:45', lat: 12.9719, lng: 77.5950 }
                ]
            },
            { id: 'r2', name: 'Downtown Express', stops: [] }
        ],
        students: [
            { id: 's1', name: 'Alice Smith', grade: '5th', parent_phone: '9876543210', bus_id: 'b1' },
            { id: 's2', name: 'Bob Jones', grade: '3rd', parent_phone: '9876543211', bus_id: 'b2' }
        ]
    }
];

export const getSchools = async (req: Request, res: Response) => {
    try {
        const schools = await prisma.school.findMany({
            include: { buses: true, drivers: true, routes: true }
        });
        res.json(schools);
    } catch (error: any) {
        console.error('Database failure, serving mock schools:', error.message);
        res.json(SESSION_MOCK_SCHOOLS);
    }
};

export const createSchool = async (req: Request, res: Response) => {
    const { name, slug, address, subscription_plan, status, logo_url, primary_color, phone, email_contact, permissions, buses, drivers, routes, students } = req.body;
    try {
        const school = await prisma.school.create({
            data: { name, slug, address, subscription_plan, status, logo_url, primary_color, phone, email_contact, permissions }
        });
        res.status(201).json(school);
    } catch (error: any) {
        console.error('Database failure, mock creation:', error.message);
        const newMock = {
            id: `mock-${Date.now()}`,
            name, slug, address, subscription_plan, status, logo_url, primary_color, permissions,
            buses: buses || [],
            drivers: drivers || [],
            routes: routes || [],
            students: students || []
        };
        SESSION_MOCK_SCHOOLS.push(newMock as any);
        res.status(201).json(newMock);
    }
};



export const updateSchool = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, slug, address, subscription_plan, status, logo_url, primary_color, phone, email_contact, permissions, buses, drivers, routes, students } = req.body;
    try {
        const school = await prisma.school.update({
            where: { id: id as string },
            data: { name, slug, address, subscription_plan, status, logo_url, primary_color, phone, email_contact, permissions }
        });
        res.json(school);
    } catch (error: any) {
        console.error('Database failure, mock update:', error.message);
        const index = SESSION_MOCK_SCHOOLS.findIndex(s => s.id === id);
        if (index !== -1) {
            const updated = {
                ...SESSION_MOCK_SCHOOLS[index],
                name, slug, address, subscription_plan, status, logo_url, primary_color, permissions,
                buses: buses || SESSION_MOCK_SCHOOLS[index].buses || [],
                drivers: drivers || SESSION_MOCK_SCHOOLS[index].drivers || [],
                routes: routes || SESSION_MOCK_SCHOOLS[index].routes || [],
                students: students || (SESSION_MOCK_SCHOOLS[index] as any).students || []
            };
            SESSION_MOCK_SCHOOLS[index] = updated as any;
            res.json(updated);
        } else {
            res.json({ id, name, slug, address, subscription_plan, status, logo_url, primary_color, permissions, buses: buses || [], drivers: drivers || [], routes: routes || [], students: students || [] });
        }
    }
};


export const deleteSchool = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.school.delete({ where: { id: id as string } });
        res.json({ message: 'School deleted successfully' });
    } catch (error: any) {
        console.error('Database failure, mock delete:', error.message);
        res.json({ message: 'School deleted successfully (Mock Mode)' });
    }
};


