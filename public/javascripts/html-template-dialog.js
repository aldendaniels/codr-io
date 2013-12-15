define(function(require)
{
    // Dependencies.
    var $        = require('lib/jquery'),
        oHelpers = require('helpers/helpers-web');
 
    var oPrimaryOptions = (
    {
        'doctypes': 
        [
            'HTML 5',
            'HTML 4.01 Strict',
            'HTML 4.01 Transitional',
            'HTML 4.01 Frameset',
            'XHTML 1.0 Strict',
            'XHTML 1.0 Transitional',
            'XHTML 1.0 Frameset',
            'XHTML 1.1'
        ],
        
        'script-languages':
        [
            'Javascript',
            'Coffeescript'
        ],
        
        'style-languages':
        [
            'CSS',
            'LESS'
        ],
        
        'script-frameworks':
        [
            'jQuery',
            'Mootools',
            'Prototype',
            'Dojo',
            'Ext JS',
            'None (Native JS)'
        ],
    });
    
    var oFrameworkVersions = (
    {
        'jQuery':
        [
            '2.0.3', '2.0.2', '2.0.1', '2.0.0', '1.10.2', '1.10.1', '1.10.0', '1.9.1', '1.9.0', '1.8.3', '1.8.2',
            '1.8.1', '1.8.0', '1.7.2', '1.7.1',  '1.7.0',  '1.6.4',  '1.6.3', '1.6.2', '1.6.1', '1.6.0', '1.5.2',
            '1.5.1', '1.5.0', '1.4.4', '1.4.3',  '1.4.2',  '1.4.1',  '1.4.0', '1.3.2', '1.3.1', '1.3.0', '1.2.6',
            '1.2.3'
        ],
        
        'Mootools':
        [
            '1.4.5', '1.4.4', '1.4.3', '1.4.2', '1.4.1', '1.4.0', '1.3.2', '1.3.1', '1.3.0', '1.2.5', '1.2.4',
            '1.2.3', '1.2.2', '1.2.1', '1.1.2', '1.1.1'
        ],
        
        'Prototype':
        [
            '1.7.1.0', '1.7.0.0', '1.6.1.0', '1.6.0.3', '1.6.0.2'
        ],
        
        'Dojo':
        [
            '1.9.2', '1.9.1', '1.9.0', '1.8.5', '1.8.4', '1.8.3', '1.8.2', '1.8.1', '1.8.0', '1.7.5', '1.7.4',
            '1.7.3', '1.7.2', '1.7.1', '1.7.0', '1.6.2', '1.6.1', '1.6.0', '1.5.3', '1.5.2', '1.5.1', '1.5.0',
            '1.4.5', '1.4.4', '1.4.3', '1.4.1', '1.4.0', '1.3.2', '1.3.1', '1.3.0', '1.2.3', '1.2.0', '1.1.1'
        ],
        
        'Ext JS':
        [
            '3.1.0', '3.0.0'
        ]
    });
    
    return oHelpers.createClass(
    {
        _oWorkspace: null,
        
        __init__: function(oWorkspace)
        {
            // Save State.
            this._oWorkspace = oWorkspace;
            
            // Populate Dropdowns.
            for (sID in oPrimaryOptions)
                this._addOptions($('select#' + sID), oPrimaryOptions[sID]);
            
            this._updateFrameworkVersions();
        },
        
        onEvent: function(oEvent)
        {
            switch(oEvent.type)
            {
                case 'change':
                    this._updateFrameworkVersions();
                    break;
                
                case 'click':
                    console.log('click!');
                    break;
                
                default:
                    console.log('Unhandled: ' + oEvent.type);
            }
        },
        
        _updateFrameworkVersions: function()
        {
            var sSelectedFramework = $('select#script-frameworks').val();
            var jVersions = $('#framework-versions');
            if (jVersions.data('sFrameworkName') != sSelectedFramework)
            {
                jVersions.data('sFrameworkName', sSelectedFramework);
                jVersions.empty();
                if (sSelectedFramework in oFrameworkVersions)
                {
                    this._addOptions(jVersions, oFrameworkVersions[sSelectedFramework], 'Version ');
                    jVersions.prop('disabled', false);
                }
                else
                    jVersions.prop('disabled', true);
            }
        },
        
        _addOptions: function(jSelect, aOptions, sOptionalsPrefix)
        {
            var sPrefix = sOptionalsPrefix || '';
            for (var i in aOptions)
                $('<option></option>').text(sPrefix + aOptions[i]).appendTo(jSelect);
        }
    });
});