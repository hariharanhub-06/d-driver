const { Router } = require('express');
const {
    updateLocation,
    getBusLocation
} = require('../controllers/locationController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();

router.post('/update', authenticateToken, updateLocation);
router.get('/:busId', authenticateToken, getBusLocation);

module.exports = router;
