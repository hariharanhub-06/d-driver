const prisma = require('../prisma');

const getAllStudents = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const students = await prisma.student.findMany({
            where: schoolId ? { school_id: schoolId } : {},
            include: { school: true, parent: true }
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error: error.message });
    }
};

const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await prisma.student.findUnique({
            where: { id },
            include: { school: true, parent: true }
        });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student', error: error.message });
    }
};

const createStudent = async (req, res) => {
    try {
        const { name, grade, section, gr_no, parent_id, route_id, stop_id, school_id } = req.body;
        const newStudent = await prisma.student.create({
            data: { name, grade, section, gr_no, parent_id, route_id, stop_id, school_id }
        });
        res.status(201).json(newStudent);
    } catch (error) {
        res.status(500).json({ message: 'Error creating student', error: error.message });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedStudent = await prisma.student.update({
            where: { id },
            data: req.body
        });
        res.json(updatedStudent);
    } catch (error) {
        res.status(500).json({ message: 'Error updating student', error: error.message });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.student.delete({ where: { id } });
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting student', error: error.message });
    }
};

module.exports = {
    getAllStudents,
    createStudent,
    getStudentById,
    updateStudent,
    deleteStudent
};
