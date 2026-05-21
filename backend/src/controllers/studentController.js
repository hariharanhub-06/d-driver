const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { uploadImage } = require('../utils/imagekit');
const { logAction } = require('../utils/auditLog');

const getAllStudents = async (req, res) => {
    try {
        let schoolId;
        if (req.user.role === 'super_admin') {
            schoolId = req.query.school_id || undefined;
        } else {
            schoolId = req.user.school_id;
        }

        const { search, route_id } = req.query;

        const where = {};
        if (schoolId) where.school_id = schoolId;
        if (route_id) where.route_id = route_id;
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const students = await prisma.student.findMany({
            where,
            include: {
                parent: { select: { name: true, phone: true } },
                route: { select: { id: true, name: true } },
                stop: { select: { id: true, name: true } },
                feeStructure: true,
            },
        });

        res.json(students);
    } catch (error) {
        console.error('getAllStudents error:', error);
        res.status(500).json({ error: 'Error fetching students' });
    }
};

const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;

        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                parent: { select: { name: true, phone: true, email: true } },
                route: { select: { id: true, name: true } },
                stop: { select: { id: true, name: true } },
                feeStructure: true,
            },
        });

        if (!student) return res.status(404).json({ error: 'Student not found' });

        res.json(student);
    } catch (error) {
        console.error('getStudentById error:', error);
        res.status(500).json({ error: 'Error fetching student' });
    }
};

const createStudent = async (req, res) => {
    try {
        const {
            name,
            grade,
            section,
            gr_no,
            parent_id,
            parent_name,
            parent_email,
            parent_phone,
            route_id,
            stop_id,
            photo_url,
            fee_amount,
            fee_frequency,
            fee_due_day,
            academic_year,
        } = req.body;

        const schoolId = req.user.role === 'super_admin' ? (req.body.school_id || req.query.school_id) : req.user.school_id;

        // Auto-create or look up parent user when parent_email is provided but no parent_id
        let resolvedParentId = parent_id || null;
        let tempPassword = null;

        if (parent_email && !parent_id) {
            const existingParent = await prisma.user.findUnique({ where: { email: parent_email } });
            if (existingParent) {
                resolvedParentId = existingParent.id;
            } else {
                tempPassword = crypto.randomBytes(8).toString('base64url');
                const hashedPassword = await bcrypt.hash(tempPassword, 12);
                const newParent = await prisma.user.create({
                    data: {
                        name: parent_name || 'Parent',
                        email: parent_email,
                        password: hashedPassword,
                        phone: parent_phone || null,
                        role: 'parent',
                        school_id: schoolId,
                        is_first_login: true,
                    },
                });
                resolvedParentId = newParent.id;
            }
        }

        const student = await prisma.student.create({
            data: {
                name,
                grade: grade || null,
                section: section || null,
                gr_no: gr_no || null,
                parent_id: resolvedParentId,
                route_id: route_id || null,
                stop_id: stop_id || null,
                photo_url: photo_url || null,
                school_id: schoolId,
            },
        });

        if (fee_amount && fee_frequency) {
            await prisma.feeStructure.create({
                data: {
                    student_id: student.id,
                    school_id: schoolId,
                    amount: parseFloat(fee_amount),
                    frequency: fee_frequency,
                    due_day: fee_due_day ? parseInt(fee_due_day) : 5,
                    academic_year: academic_year || String(new Date().getFullYear()),
                    is_active: true,
                },
            });
        }

        if (resolvedParentId) {
            await prisma.notification.create({
                data: {
                    user_id: resolvedParentId,
                    school_id: schoolId,
                    type: 'info',
                    message: `${name} has been registered as your child in the school bus system.`,
                },
            });
        }

        const fullStudent = await prisma.student.findUnique({
            where: { id: student.id },
            include: {
                feeStructure: true,
                route: { select: { id: true, name: true } },
                stop: { select: { id: true, name: true } },
            },
        });

        await logAction({ req, action: 'create_student', targetType: 'student', targetId: student.id });
        res.status(201).json({ ...fullStudent, temp_password: tempPassword });
    } catch (error) {
        console.error('createStudent error:', error);
        res.status(500).json({ error: 'Error creating student' });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, grade, section, gr_no, parent_id, parent_name, parent_email, parent_phone,
            route_id, stop_id, photo_url,
            fee_amount, fee_frequency, fee_due_day, academic_year,
        } = req.body;
        const schoolId = req.user.school_id || null;

        const data = {};
        if (name !== undefined) data.name = name;
        if (grade !== undefined) data.grade = grade;
        if (section !== undefined) data.section = section;
        if (gr_no !== undefined) data.gr_no = gr_no;
        if (route_id !== undefined) data.route_id = route_id;
        if (stop_id !== undefined) data.stop_id = stop_id;
        if (photo_url !== undefined) data.photo_url = photo_url;

        // Resolve parent: explicit ID takes precedence, else look up / create by email
        if (parent_id !== undefined) {
            data.parent_id = parent_id;
        } else if (parent_email) {
            let parentUser = await prisma.user.findUnique({ where: { email: parent_email } });
            if (!parentUser) {
                const tempPassword = crypto.randomBytes(8).toString('hex');
                const hashedPassword = await bcrypt.hash(tempPassword, 12);
                parentUser = await prisma.user.create({
                    data: { name: parent_name || 'Parent', email: parent_email, password: hashedPassword, phone: parent_phone || null, role: 'parent', school_id: schoolId, is_first_login: true, is_active: true },
                });
            }
            data.parent_id = parentUser.id;
        }

        const updatedStudent = await prisma.student.update({
            where: { id },
            data,
        });

        if (fee_amount) {
            const resolvedSchoolId = schoolId || updatedStudent.school_id;
            await prisma.feeStructure.upsert({
                where: { student_id: id },
                create: {
                    student_id: id,
                    school_id: resolvedSchoolId,
                    amount: parseFloat(fee_amount),
                    frequency: fee_frequency || 'monthly',
                    due_day: fee_due_day ? parseInt(fee_due_day) : 5,
                    academic_year: academic_year || String(new Date().getFullYear()),
                    is_active: true,
                },
                update: {
                    amount: parseFloat(fee_amount),
                    frequency: fee_frequency || 'monthly',
                    due_day: fee_due_day ? parseInt(fee_due_day) : 5,
                    academic_year: academic_year || String(new Date().getFullYear()),
                },
            });
        }

        await logAction({ req, action: 'update_student', targetType: 'student', targetId: id });
        res.json(updatedStudent);
    } catch (error) {
        console.error('updateStudent error:', error);
        res.status(500).json({ error: 'Error updating student' });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.student.delete({ where: { id } });
        await logAction({ req, action: 'delete_student', targetType: 'student', targetId: id });
        res.json({ deleted: true });
    } catch (error) {
        console.error('deleteStudent error:', error);
        res.status(500).json({ error: 'Error deleting student' });
    }
};

const uploadStudentPhoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { buffer, originalname } = req.file;
        const result = await uploadImage(buffer, originalname, 'student-photos');

        const { student_id } = req.query;
        if (student_id) {
            await prisma.student.update({
                where: { id: student_id },
                data: { photo_url: result.url },
            });
        }

        res.json({ url: result.url, fileId: result.fileId });
    } catch (error) {
        console.error('uploadStudentPhoto error:', error);
        res.status(500).json({ error: 'Error uploading photo' });
    }
};

const bulkCreateStudents = async (req, res) => {
    try {
        const { students } = req.body;
        const schoolId = req.user.school_id;

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ error: 'students array is required' });
        }

        const created = [];
        const errors = [];

        for (const row of students) {
            try {
                let parentUser = null;

                if (row.parent_phone) {
                    parentUser = await prisma.user.findFirst({
                        where: { phone: row.parent_phone },
                    });
                }

                if (!parentUser && row.parent_email) {
                    parentUser = await prisma.user.findFirst({
                        where: { email: row.parent_email },
                    });
                }

                if (!parentUser) {
                    const tempPassword = crypto.randomBytes(8).toString('hex');
                    const hashedPassword = await bcrypt.hash(tempPassword, 12);

                    parentUser = await prisma.user.create({
                        data: {
                            name: row.parent_name || 'Parent',
                            email: row.parent_email || `parent_${Date.now()}@placeholder.local`,
                            password: hashedPassword,
                            phone: row.parent_phone || null,
                            role: 'parent',
                            school_id: schoolId,
                            is_first_login: true,
                        },
                    });
                }

                const student = await prisma.student.create({
                    data: {
                        name: row.name,
                        gr_no: row.gr_no || null,
                        grade: row.grade || null,
                        section: row.section || null,
                        parent_id: parentUser.id,
                        route_id: row.route_id || null,
                        stop_id: row.stop_id || null,
                        school_id: schoolId,
                    },
                });

                created.push(student);
            } catch (err) {
                errors.push({ name: row.name, error: err.message });
            }
        }

        res.status(201).json({ created, errors });
    } catch (error) {
        console.error('bulkCreateStudents error:', error);
        res.status(500).json({ error: 'Error bulk creating students' });
    }
};

const getMyStudents = async (req, res) => {
    try {
        const parent = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, role: true },
        });
        if (!parent || parent.role !== 'parent') return res.json([]);

        const students = await prisma.student.findMany({
            where: { parent_id: parent.id },
            include: {
                route: { select: { id: true, name: true, route_type: true, bus_id: true } },
                stop: { select: { id: true, name: true, pickup_time: true } },
            },
        });
        res.json(students);
    } catch (err) {
        console.error('getMyStudents error:', err);
        res.status(500).json({ error: 'Error fetching students' });
    }
};

module.exports = {
    getAllStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    uploadStudentPhoto,
    bulkCreateStudents,
    getMyStudents,
};
