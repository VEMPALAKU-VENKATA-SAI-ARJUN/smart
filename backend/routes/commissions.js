const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({ message: 'Get all commissions' }));
router.post('/', (req, res) => res.json({ message: 'Create commission' }));
router.put('/:id', (req, res) => res.json({ message: `Update commission ${req.params.id}` }));
router.delete('/:id', (req, res) => res.json({ message: `Delete commission ${req.params.id}` }));

module.exports = router;
