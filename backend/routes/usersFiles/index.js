const express = require('express');
const router = express.Router();

router.use('/', require('./profileRoutes'));
router.use('/', require('./artworkRoutes'));
router.use('/', require('./statsRoutes'));
router.use('/', require('./followRoutes'));
router.use('/search', require('./searchRoutes'));

module.exports = router;
