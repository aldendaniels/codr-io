
requirejs.config(
{
    // To get timely, correct error triggers in IE, require all scrips to
    // either use define() or be defined as a shim.
    // check.
    enforceDefine: true,
    
    baseUrl: '/javascripts/',
    
    shim: // Used for scripts that have no define()
    {
        'lib/tooltip':
        {
            exports: '$'
        },
        
        'lib/linkify':
        {
            exports: '$'
        },
        
        'tests/qunit':
        {
            exports: 'QUnit',
        }
    }
});
