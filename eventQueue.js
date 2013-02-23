var oHelpers = require('./helpers');

var EventQueue = oHelpers.createClass({

    _aEvents: null,
    
    __init__: function()
    {
        this._aEvents = [];
    },

    push: function(oEvent)
    {
        this._aEvents.push(oEvent);
        return oEvent;
        // TODO: Do magic here in a very long time from now.
    }
});

module.exports = {
    "EventQueue": EventQueue
};