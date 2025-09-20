const express = require('express');
const router = express.Router();
const { createTicket, validateTicket,  getUserTickets, getTicketQR, getTicketQRPage, confirmCashPayment } = require('../controllers/tickets');
const { clientMiddleware, chauffeurMiddleware, anyUserMiddleware } = require('../middlewares/auth');

// Routes clients
router.post('/create', clientMiddleware, createTicket);
router.get('/', clientMiddleware, getUserTickets);
router.get('/:ticketId/page', clientMiddleware, getTicketQRPage);
router.get('/:ticketId/', clientMiddleware, getTicketQR);

// Routes chauffeurs
router.post('/validate', chauffeurMiddleware, validateTicket);
router.post('/:ticketId/confirm-cash', chauffeurMiddleware, confirmCashPayment);

module.exports = router;