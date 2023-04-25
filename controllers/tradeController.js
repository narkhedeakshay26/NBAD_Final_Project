const Trade = require('../models/trade');
const Offer = require('../models/offer');
const model = require('../models/user');

// This is used to display the home page
exports.index = (_req, res, next) => {
    let categories = [];
    Trade.distinct("topic", function(_error, results){
        categories = results;
    });
    Trade.find()
    .then(trades => res.render('./trade/index', {trades, categories}))
    .catch(err=>next(err));
};

exports.new = (_req, res) => {
    res.render('./trade/new');
};

exports.create = (req, res, next) => {
    let trade = new Trade(req.body);//create a new trade document
    trade.host = req.session.user;
    trade.save()//insert the document to the database
    .then(_trade=> { 
    req.flash('success', 'You have successfully created a new trade');
    res.redirect('/trades');
})
    .catch(err=>{
        if(err.name === 'ValidationError' ) {
            req.flash('error', err.message);
            res.redirect('back');
        }else{
            next(err);
        }
    });
};

// show the trade items and check validations
exports.show = (req, res, next) => {
    let id = req.params.id;
    Trade.findById(id).populate('host', 'firstName lastName')
    .then(trade=>{
        if(trade) {
            return res.render('./trade/show', {trade});
        } else {
            let err = new Error('Cannot find a trade with id ' + id);
            err.status = 404;
            next(err);
        }
    })
    .catch(err=>next(err));
};

// edit the trade item and check validations

exports.edit = (req, res, next) => {
    let id = req.params.id;
    Trade.findById(id)
    .then(trade=>{
        if(trade) {
            return res.render('./trade/edit', {trade});
        } else {
            let err = new Error('Cannot find a trade with id ' + id);
            err.status = 404;
            next(err);
        }
    })
    .catch(err=>next(err));
};
    
// update the trade item and check validations
exports.update = (req, res, next) => {
    let id = req.params.id;
    let trade = req.body;
    Trade.findByIdAndUpdate(id, trade, {useFindAndModify: false, runValidators: true})
    .then(trade=>{
        if(trade) {
            req.flash('success', 'trade has been successfully updated');
            res.redirect('/trades/'+id);
        } else {
            let err = new Error('Cannot find a trade with id ' + id);
            err.status = 404;
            next(err);
        }
    })
    .catch(err=> {
        if(err.name === 'ValidationError'){
            req.flash('error', err.message);
            res.redirect('back');
        }else{
            next(err);
        }
    });
};

// delete the trade and check validations
exports.delete = (req, res, next) => {
    let id = req.params.id;
    Trade.findByIdAndDelete(id, {useFindAndModify: false})
    .then(trade =>{
        if(trade) {
            res.redirect('/trades');
        } else {
            let err = new Error('Cannot find a trade with id ' + id);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err=>next(err));
};

exports.watch = (req, res, next) => {  
    const id = req.params.id;
    Trade.findById(id)
    .then(trade => {
        if(!trade.watchBy.includes(req.session.user)) 
        {
            trade.watchBy.push(req.session.user);
        }
        Trade.findByIdAndUpdate(id, trade, {useFindAndModify: false, runValidators: true})
        .then(watchTrade => {
            return res.redirect('/users/profile');
        })
        .catch(err => next(err))
    })
    .catch(err => next(err))
};

exports.unwatch = (req, res, next) => {  
    const id = req.params.id;
    Trade.findById(id)
    .then(trade => {
        const watchIndex = trade.watchBy.indexOf(req.session.user);
        if(watchIndex !== -1) 
        {
            trade.watchBy.splice(watchIndex, 1);
        }
        Trade.findByIdAndUpdate(id, trade, {useFindAndModify: false, runValidators: true})
        .then(watchTrade => {
            return res.redirect('back');
        })
        .catch(err => next(err))
    })
    .catch(err => next(err))
};

exports.trade = (req, res, next)=>{
    let otherItem = {id: req.params.id };
    let id = req.session.user;
    Promise.all([model.findById(id), Trade.find({host: id, status: "Available"})]) 
    .then(results=>{
        const [user, trades] = results;
        res.render('./user/trade', {user, trades, otherItem})
    })
    .catch(err=>next(err));
};

exports.offer = (req, res, next) => { 
    let offer = new Offer(req.body);
    offer.otherItemId = req.params.id;
    offer.tradersId = req.session.user;
    offer.save()
    .then(offerTrade => {
        Trade.updateMany(
            {"_id":{$in: [offer.tradeId, offer.otherItemId]}}, 
            {status: "Offer Pending", offerId: offerTrade.id})
        .then(result => {
            req.flash('success', 'Trade Offer has been created successfully!');
            return res.redirect('/users/profile');
        })
        .catch(err=>next(err))
    })
    .catch(err=>next(err));
};

exports.cancelOffer = (req, res, next) => { 
    Offer.findById(req.params.id)
    .then(offerTrade => {
        Trade.updateMany(
            {"_id": {$in: [offerTrade.tradeId, offerTrade.otherItemId]}}, 
            {status: "Available", offerId: null})
        .then(result => {
            Offer.findByIdAndDelete(offerTrade.id, {useFindAndModify: false, runValidators: true})
            .then(result => {
                return res.redirect('/users/profile');
            })
            .catch(err => next(err));
        })
    })
    .catch(err => next(err))
};

exports.manageOffer = (req, res, next) => { 
    const tradersId = req.session.user;
    let id = req.params.id;
    Offer.findById(req.params.id)
    .then(offerTrade => {
        if(offerTrade) {
            Trade.find({"_id": {$in: [offerTrade.tradeId, offerTrade.otherItemId]}})
            .then(result => {
                console.log(result);
                if (result  && result.length === 2) 
                {
                    const user = { isOfferInitiator: offerTrade.tradersId == tradersId ? true: false};
                    let trade1, trade2 = null;
                    if(result[0].host == tradersId) 
                    {
                        trade1 = result[0];
                        trade2 = result[1];
                    } 
                    else 
                    {
                        trade1 = result[1];
                        trade2 = result[0];
                    }
                    res.render('./offer/manage', {user, trade1, trade2, offerTrade});
                } 
                else 
                {
                    let err = new Error('Cannot find item with id '+ id)
                    err.status = 404;
                    next(err);
                }
        
            })
        } 
        else 
        {
            let err = new Error('Cannot find the offer associated with this Item')
            err.status = 404;
            next(err);
        } 
    })      
    .catch(err => next(err))
};

exports.acceptOffer = (req, res, next) => { 
    Offer.findById(req.params.id)
    .then(offerTrade => {
        Trade.updateMany(
            {"_id": {$in: [offerTrade.tradeId, offerTrade.otherItemId]}}, 
            {status: "Traded"})
        .then(result => {
           return res.redirect('/users/profile');
        })
        .catch(err => next(err))
    })
    .catch(err => {
        next(err);
    });
};

exports.rejectOffer = (req, res, next) => { 
    Offer.findById(req.params.id)
    .then(offerTrade => {
        Trade.updateMany(
            {"_id": {$in: [offerTrade.tradeId, offerTrade.otherItemId]}}, 
            {status: "Available", offerId: null})
        .then(result => {
            Offer.findByIdAndDelete(offerTrade.id, {useFindAndModify: false, runValidators: true})
            .then(result => {
                return res.redirect('/users/profile');
            })
            .catch(err=>next(err));
        })
        .catch(err=>next(err))
    })
    .catch(err=>next(err));
};
