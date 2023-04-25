const express = require('express');
const router = express.Router();
const controller = require('../controllers/tradeController');
const { isLoggedIn, isHost, isNotHost, isOffer, isNotOffer } = require('../middlewares/auth');
const { validateId, validateTrade, validateStatus, validateResult} = require('../middlewares/validator'); 


//GET /trades: send all trades to the user
router.get('/', controller.index);

//GET /trades/new: send html form for creating a new trade
router.get('/new', isLoggedIn, controller.new);

//POST /trades: create a new trade
router.post('/', isLoggedIn, controller.create);

//GET /trades/:id: send details of trade identified by id
router.get('/:id', validateId, controller.show);

//GET /trades/:id: send html form for editing an existing trade
router.get('/:id/edit', validateId, isLoggedIn, isHost, controller.edit);

//PUT /trades/:id: update the trade identified by id
router.put('/:id', validateId, isLoggedIn, isHost, controller.update);

//DELETE /trades/:id: delete the trade identified by id
router.delete('/:id', validateId, isLoggedIn, isHost, controller.delete);

router.post('/:id/watch',validateId, isLoggedIn, isNotHost, controller.watch);

router.put('/:id/unwatch', validateId, isLoggedIn, isNotHost, controller.unwatch);

router.get('/:id/trade', validateId, isLoggedIn, isNotHost, controller.trade);

router.put('/:id/offer', validateId, isLoggedIn, isNotHost, controller.offer);

router.get('/:id/manage', validateId, isLoggedIn, controller.manageOffer);

router.put('/:id/acceptOffer', validateId, isLoggedIn, isNotOffer, controller.acceptOffer);

router.delete('/:id/rejectOffer', validateId, isLoggedIn, isNotOffer, controller.rejectOffer);

router.delete('/:id/cancelOffer', validateId, isLoggedIn, isOffer, controller.cancelOffer);
 

module.exports=router;  