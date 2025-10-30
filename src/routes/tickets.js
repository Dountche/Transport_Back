const express = require('express');
const router = express.Router();
const { createTicket, validateTicket,  getUserTickets, getTicketQR, getTicketQRPage, confirmCashPayment, getTicketById, getTicketsValidatedByDriver } = require('../controllers/tickets');
const { clientMiddleware, chauffeurMiddleware, authMiddleware } = require('../middlewares/auth');

// Routes clients
router.post('/create', clientMiddleware, createTicket);
router.get('/:id/', clientMiddleware, getTicketById);
router.get('/', clientMiddleware, getUserTickets);
router.get('/page/:ticketId', clientMiddleware, getTicketQRPage);
router.get('/png/:ticketId/', clientMiddleware, getTicketQR);


// Routes chauffeurs
router.post('/validate', chauffeurMiddleware, validateTicket);
router.post('/:ticketId/confirm-cash', chauffeurMiddleware, confirmCashPayment);
router.get('/driver/list', chauffeurMiddleware, getTicketsValidatedByDriver);

module.exports = router;