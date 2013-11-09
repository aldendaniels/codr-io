
requirejs.config(
{
    // To get timely, correct error triggers in IE, require all scrips to
    // either use define() or be defined as a shim.
    // check.
    enforceDefine: true,
    
    baseUrl: '/javascripts/',
    
    shim: // Used for scripts that have no define()
    {
        'edit-control/ace/ace':
        {
            exports: 'ace'
        },
        
        'lib/jquery':
        {
            exports: '$'
        },
        
        'tests/qunit':
        {
            deps: ['lib/jquery'], 
            exports: 'QUnit',
        }
    }
});