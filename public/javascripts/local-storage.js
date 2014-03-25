define(function(require)
{
    var oHelpers = require('helpers/helpers-web');
    return {
        supportsLocalStorage: function()
        {
            return !!localStorage;
        },

        setKey: function(sKey, oValue)
        {
            this._assertLocalStorage();
            localStorage.setItem(sKey, JSON.stringify(oValue));
        },

        getKey: function(sKey)
        {
            this._assertLocalStorage();
            return JSON.parse(localStorage.getItem(sKey));
        },

        _assertLocalStorage: function()
        {
            oHelpers.assert(this.supportsLocalStorage(), 'This browser does not support local storage.');
        }
    };
});
