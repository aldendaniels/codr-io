
if (typeof window == 'undefined')
{
    var oHelpers = require('./public/javascripts/helpers/helpers');    
}

var Document = oHelpers.createClass(
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
            aLines: '',
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
    
    _load: function()
    {
        if (typeof(optionalJSONorObj) == 'string')
            oData = oHelpers.fromJSON(optionalJSONorObj);
        else if (typeof(optionalJSONorObj) == 'object')
            oData = optionalJSONorObj;
        else
            oHelpers.assert(false, 'Invalid document data type.');
        
        // Set values.
        for (var sKey in oData)
            this.set(sKey, oData[sKey]);
    },
    
    _applyDelta: function(oDelta)
    {
        // Split.
        this._splitLine(oDelta.oRange.oStart);
        this._splitLine(oDelta.oRange.oEnd);
        
        // Insert or Delete.
        switch (oDelta.sType)
        {
            case 'insert':
                for (var i = 0; i < oDelta.aLines.length; i++)
                {
                    var iDocLine = oDelta.oRange.oStart.iRow + 1 + i;
                    this._aLines.splice(iDocLine, 0, oDelta.aLines[i]);
                }
                break;
            
            case 'delete':
                this._aLines.splice(
                    oDelta.oRange.oStart.iRow,                              // Where to start deleting
                    oDelta.oRange.oEnd.iRow - oDelta.oRange.oStart.iRow + 1 // Num lines to delete.
                );
                break;
            
            default:
                oHelpers.assert(false, 'Invalid delta type.');
        }
        
        // Join start row.
        this._joinLineWithNext(oDelta.oRange.oStart.iRow);
        
        // Join end row for single line insert/delete actions.
        if (oDelta.oRange.oStart.iRow == oDelta.oRange.oEnd.iRow)
            this._joinLineWithNext(oDelta.oRange.oEnd.iRow);
    },
    
    _splitLine: function(oPoint)
    {
        var sText = this._aLines[oPoint.iRow];
        this._aLines[oPoint.iRow] = sText.slice(0, oPoint.iCol);
        this._aLines.splice(oPoint.iRow, 0, sText.slice(oPoint.icol));
    },
    
    _joinLineWithNext: function(iRow)
    {
        this._aLines[iRow] == this._aLines[iRow + 1];
        this.splice(iRow + 1, 1);
    }
});

if (typeof window == 'undefined')
    module.exports = Document;