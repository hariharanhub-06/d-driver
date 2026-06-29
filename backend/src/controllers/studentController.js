const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { uploadImage } = require('../utils/imagekit');
const { logAction } = require('../utils/auditLog');

const getAllStudents = async (req, res) => {
    try {
        const { getSchoolFilter } = require('../middleware/authMiddleware');
        const { search, route_id } = req.query;

        const where = { ...getSchoolFilter(req) };
        if (route_id) where.route_id = route_id;
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const students = await prisma.student.findMany({
            where,
            include: {
                parent: { select: { id: true, name: true, email: true, phone: true } },
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
            parent_password,
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

        if (!parent_id && (parent_email || parent_phone)) {
            // Look up an existing user by email first, then by phone. User.phone is globally
            // @unique, so reusing a guardian's number (e.g. a second child / shared guardian)
            // would otherwise crash student creation with a unique-constraint error — instead
            // we link to that existing parent. We only create a NEW parent when both the email
            // and phone are free, so the insert can never hit a duplicate.
            let existingUser = null;
            if (parent_email) existingUser = await prisma.user.findUnique({ where: { email: parent_email } });
            if (!existingUser && parent_phone) existingUser = await prisma.user.findFirst({ where: { phone: parent_phone } });

            if (existingUser) {
                if (existingUser.role !== 'parent') {
                    const what = parent_email && existingUser.email === parent_email ? 'email' : 'phone number';
                    return res.status(409).json({
                        error: `This ${what} is already registered as ${existingUser.role === 'admin' ? 'an admin' : `a ${existingUser.role}`}. Use a different one for the parent account.`,
                    });
                }
                resolvedParentId = existingUser.id;
            } else if (parent_email) {
                tempPassword = parent_password || crypto.randomBytes(8).toString('base64url');
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
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
            const field = target.includes('phone') ? 'phone number' : target.includes('email') ? 'email' : 'value';
            return res.status(409).json({ error: `A user with this ${field} already exists. Use a different one for the parent account.` });
        }
        res.status(500).json({ error: 'Error creating student' });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, grade, section, gr_no, parent_id, parent_name, parent_email, parent_phone, parent_password,
            route_id, stop_id, photo_url,
            fee_amount, fee_frequency, fee_due_day, academic_year,
        } = req.body;
        const schoolId = req.user.school_id || null;

        const data = {};
        let createdParentTempPassword = null;
        if (name !== undefined) data.name = name;
        if (grade !== undefined) data.grade = grade;
        if (section !== undefined) data.section = section;
        if (gr_no !== undefined) data.gr_no = gr_no;
        if (route_id !== undefined) data.route_id = route_id;
        if (stop_id !== undefined) data.stop_id = stop_id;
        if (photo_url !== undefined) data.photo_url = photo_url;

        // Resolve parent: explicit ID takes precedence, else look up / create by email
        if (parent_id !== undefined && parent_id) {
            data.parent_id = parent_id;
        } else if (parent_email || parent_phone) {
            // Same email-then-phone lookup as createStudent: a reused guardian number links to
            // the existing parent instead of crashing, and a brand-new parent can be created
            // straight from the edit form (with the admin-set or an auto-generated password).
            let parentUser = null;
            if (parent_email) parentUser = await prisma.user.findUnique({ where: { email: parent_email } });
            if (!parentUser && parent_phone) parentUser = await prisma.user.findFirst({ where: { phone: parent_phone } });
            if (parentUser && parentUser.role !== 'parent') {
                const what = parent_email && parentUser.email === parent_email ? 'email' : 'phone number';
                return res.status(409).json({
                    error: `This ${what} is already registered as ${parentUser.role === 'admin' ? 'an admin' : `a ${parentUser.role}`}. Use a different one for the parent account.`,
                });
            }
            if (!parentUser && parent_email) {
                createdParentTempPassword = parent_password || crypto.randomBytes(8).toString('base64url');
                const hashedPassword = await bcrypt.hash(createdParentTempPassword, 12);
                parentUser = await prisma.user.create({
                    data: { name: parent_name || 'Parent', email: parent_email, password: hashedPassword, phone: parent_phone || null, role: 'parent', school_id: schoolId, is_first_login: true, is_active: true },
                });
            }
            if (parentUser) data.parent_id = parentUser.id;
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
        res.json({ ...updatedStudent, temp_password: createdParentTempPassword });
    } catch (error) {
        console.error('updateStudent error:', error);
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
            const field = target.includes('phone') ? 'phone number' : target.includes('email') ? 'email' : 'value';
            return res.status(409).json({ error: `A user with this ${field} already exists. Use a different one for the parent account.` });
        }
        res.status(500).json({ error: 'Error updating student' });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        // Delete related records that don't have onDelete: Cascade in schema
        await prisma.$transaction([
            prisma.stopChangeRequest.deleteMany({ where: { student_id: id } }),
            prisma.absenceReport.deleteMany({ where: { student_id: id } }),
            prisma.feeStructure.deleteMany({ where: { student_id: id } }),
            prisma.student.delete({ where: { id } }),
        ]);
        await logAction({ req, action: 'delete_student', targetType: 'student', targetId: id });
        res.json({ deleted: true });
    } catch (error) {
        console.error('deleteStudent error:', error);
        res.status(500).json({ error: 'Error deleting student', details: error.message });
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
        const updated = [];
        const errors = [];

        for (const row of students) {
            try {
                // Resolve route by name
                let resolvedRouteId = row.route_id || null;
                if (!resolvedRouteId && row.route_name) {
                    const route = await prisma.route.findFirst({
                        where: { name: { equals: row.route_name, mode: 'insensitive' }, school_id: schoolId },
                    });
                    resolvedRouteId = route?.id || null;
                }

                // Resolve stop by name within the resolved route
                let resolvedStopId = row.stop_id || null;
                if (!resolvedStopId && row.stop_name && resolvedRouteId) {
                    const stop = await prisma.stop.findFirst({
                        where: { name: { equals: row.stop_name, mode: 'insensitive' }, route_id: resolvedRouteId },
                    });
                    resolvedStopId = stop?.id || null;
                }

                // Find or create parent
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
                    const rawTemp = row.parent_temp_password?.trim();
                    const tempPassword = rawTemp || crypto.randomBytes(8).toString('hex');
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

                // Upsert: match existing student by gr_no (if provided) or name within school
                let student;
                let isUpdate = false;
                let existingStudent = null;

                if (row.gr_no) {
                    existingStudent = await prisma.student.findFirst({
                        where: { gr_no: row.gr_no, school_id: schoolId },
                    });
                }
                if (!existingStudent && row.name) {
                    existingStudent = await prisma.student.findFirst({
                        where: { name: { equals: row.name, mode: 'insensitive' }, school_id: schoolId },
                    });
                }

                if (existingStudent) {
                    student = await prisma.student.update({
                        where: { id: existingStudent.id },
                        data: {
                            name: row.name,
                            grade: row.grade || existingStudent.grade,
                            section: row.section || existingStudent.section,
                            parent_id: parentUser.id,
                            ...(resolvedRouteId && { route_id: resolvedRouteId }),
                            ...(resolvedStopId && { stop_id: resolvedStopId }),
                        },
                    });
                    isUpdate = true;
                } else {
                    student = await prisma.student.create({
                        data: {
                            name: row.name,
                            gr_no: row.gr_no || null,
                            grade: row.grade || null,
                            section: row.section || null,
                            parent_id: parentUser.id,
                            route_id: resolvedRouteId,
                            stop_id: resolvedStopId,
                            school_id: schoolId,
                        },
                    });
                }

                // Create fee structure if fee_amount provided
                if (row.fee_amount && parseFloat(row.fee_amount) > 0) {
                    const freq = row.fee_frequency || 'monthly';
                    const now = new Date();
                    const academicYear = now.getMonth() >= 5
                        ? `${now.getFullYear()}-${now.getFullYear() + 1}`
                        : `${now.getFullYear() - 1}-${now.getFullYear()}`;
                    await prisma.feeStructure.upsert({
                        where: { student_id: student.id },
                        create: {
                            student_id: student.id,
                            school_id: schoolId,
                            amount: parseFloat(row.fee_amount),
                            frequency: freq,
                            academic_year: academicYear,
                        },
                        update: {
                            amount: parseFloat(row.fee_amount),
                            frequency: freq,
                        },
                    });
                }

                if (isUpdate) { updated.push(student); } else { created.push(student); }
            } catch (err) {
                errors.push({ name: row.name, error: err.message });
            }
        }

        res.status(201).json({ created, updated, errors });
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
                // School name lets the parent app label which school each child belongs to
                // (children can be in different schools — see the account switcher).
                school: { select: { id: true, name: true } },
                route: {
                    select: {
                        id: true, name: true, route_type: true, bus_id: true,
                        bus: { select: { id: true, bus_number: true, drivers: { select: { user: { select: { name: true, phone: true } } }, take: 1 } } },
                        stops: { select: { id: true, name: true, latitude: true, longitude: true, sequence: true, pickup_time: true, drop_time: true, trip_type: true }, orderBy: { sequence: 'asc' } },
                    },
                },
                stop: { select: { id: true, name: true, pickup_time: true, latitude: true, longitude: true } },
            },
        });
        res.json(students);
    } catch (err) {
        console.error('getMyStudents error:', err);
        res.status(500).json({ error: 'Error fetching students' });
    }
};

// Cross-school parent search for the admin "link to existing parent" flow. Matches active
// parent accounts by email / phone / name so a child in a second school can be attached to
// the SAME parent account (one login, multiple children — switchable in the parent app).
const searchParents = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 3) return res.json([]);
        const parents = await prisma.user.findMany({
            where: {
                role: 'parent',
                is_active: true,
                OR: [
                    { email: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q } },
                    { name: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: 15,
            orderBy: { name: 'asc' },
            select: {
                id: true, name: true, email: true, phone: true,
                school: { select: { name: true } },
                _count: { select: { children: true } },
            },
        });
        res.json(parents);
    } catch (error) {
        console.error('searchParents error:', error.message);
        res.status(500).json({ error: 'Error searching parents' });
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
    searchParents,
};
