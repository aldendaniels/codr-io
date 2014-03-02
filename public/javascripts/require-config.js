
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
        
        'lib/tooltip':
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

define('lib/jquery', function(require)
{
    if (window.$)
        return $;
    else
        throw 'Error: jQuery should be loaded in the HTML.'
});
