
requirejs.config(
{
    // To get timely, correct error triggers in IE, require all scrips to
    // either use define() or be defined as a shim.
    // check.
    enforceDefine: true,
    
    baseUrl: '/javascripts/',
    
    paths:
    {
        'jquery': [
            //'http://ajax.googleapis.com/ajax/libs/jquery/2.0.2/jquery.min', // your cdn
            'lib/jquery' // your fallback
        ],
        
        /* Ace paths don't work unless hard-coded here. */
        'ace': [ 'edit-control/ace' ],
    },
    
    map: {
        // See http://requirejs.org/docs/jquery.html
        // '*' means all modules will get 'jquery-private'
        // for their 'jquery' dependency.
        '*': { 'jquery': 'lib/jquery-private' },
        
        // 'jquery-private' wants the real jQuery module
        // though. If this line was not here, there would
        // be an unresolvable cyclic dependency.
        'lib/jquery-private': { 'jquery': 'jquery' }
    },
    
    shim: {} // Used for scripts that have no define().
});