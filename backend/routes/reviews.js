const express = require('express');
const router = express.Router();

// CRUD for reviews
router.get('/', (req, res) => res.json({ message: 'Get all reviews' }));
router.post('/', (req, res) => res.json({ message: 'Create review' }));
router.put('/:id', (req, res) => res.json({ message: `Update review ${req.params.id}` }));
router.delete('/:id', (req, res) => res.json({ message: `Delete review ${req.params.id}` }));

module.exports = router;
