// Makes importable via node.
// See http://requirejs.org/docs/node.html
if (typeof define !== 'function')
{
    var define = require('amdefine')(module);
}

// Use "Define" syntax to allow use in browser for testing.
define(function(require)
{
    // Dependencies
    var oHelpers = require('./public/javascripts/helpers/helpers-core');
    
    // Document class
    return oHelpers.createClass(
    {
        oData: null,       // Document data
        _aDateKeys: null,  // Keys that should be parsed as dates (recursive).
        
        __init__: function(optionalJSONorObj)
        {
            // Default values.
            this._aDateKeys = ['oDateCreated'];
            this._oData = {
                bReadOnly: false,
                aSnapshots: [],
                sParentID: '',
                sTitle: 'Untitled',
                sMode: '',
                aLines: [''],
                aChatHistory: [],
                bIsSnapshot: false,
                oDateCreated: new Date()
            }
            if (optionalJSONorObj)
                this._load(optionalJSONorObj);
        },
        
        set: function(sKey, val)
        {
            oHelpers.assert(sKey in this._oData, 'Error: Can\'t set invalid doc attr: ' + sKey);
            oHelpers.assert(typeof(val) == typeof(this._oData[sKey]) &&
                           (val instanceof Array) == (this._oData[sKey] instanceof Array),
                            'Error: Invalid document attribute type: ' + typeof(val) + ' for doc attr:  ' + sKey);
            this._oData[sKey] = val;
        },
        
        get: function(sKey)
        {
            oHelpers.assert(sKey in this._oData, 'Error: Can\'t get invalid doc attr: ' + sKey);
            return this._oData[sKey];
        },
            
        clone: function(bIsSnapshot)
        {
            var oClone = new Document(this.toJSON());
            oClone.set('bIsSnapshot', bIsSnapshot || false);
            oClone.set('aSnapshots', []);
            oClone.set('oDateCreated', new Date());
            oClone.set('aChatHistory', []);
            return oClone;
        },
                
        toJSON: function()
        {
            return oHelpers.toJSON(this._oData);
        },
        
        _load: function(optionalJSONorObj)
        {
            if (typeof optionalJSONorObj == 'string')
                oData = oHelpers.fromJSON(optionalJSONorObj);
            else if (typeof optionalJSONorObj == 'object')
                oData = optionalJSONorObj;
            else
                oHelpers.assert(false, 'Invalid document data type.');
            
            // Set values.
            for (var sKey in oData)
                this.set(sKey, oData[sKey]);
        },
        
        applyDelta: function(oDelta)
        {
            switch (oDelta.sAction)
            {
                case 'insert':
                    this._splitLine(oDelta.oRange.oStart);
                    for (var i = 0; i < oDelta.aLines.length; i++)
                    {
                        var iDocLine = oDelta.oRange.oStart.iRow + 1 + i;
                        this.get('aLines').splice(iDocLine, 0, oDelta.aLines[i]);
                    }
                    this._joinLineWithNext(oDelta.oRange.oStart.iRow);
                    this._joinLineWithNext(oDelta.oRange.oEnd.iRow);
                    break;
                
                case 'delete':
                    this._splitLine(oDelta.oRange.oEnd);
                    this._splitLine(oDelta.oRange.oStart);
                    this.get('aLines').splice(
                        oDelta.oRange.oStart.iRow + 1,                           // Where to start deleting
                        oDelta.oRange.oEnd.iRow - oDelta.oRange.oStart.iRow + 1  // Num lines to delete.
                    );
                    this._joinLineWithNext(oDelta.oRange.oStart.iRow);
                    break;
                
                default:
                    oHelpers.assert(false, 'Invalid delta type: ' + oDelta.sAction);
            }
        },
        
        _splitLine: function(oPoint)
        {
            var sText = this.get('aLines')[oPoint.iRow];
            this.get('aLines')[oPoint.iRow] = sText.slice(0, oPoint.iCol);
            this.get('aLines').splice(oPoint.iRow + 1, 0, sText.slice(oPoint.iCol));
        },
        
        _joinLineWithNext: function(iRow)
        {
            this.get('aLines')[iRow] += this.get('aLines')[iRow + 1];
            this.get('aLines').splice(iRow + 1, 1);            
        }
    });
});