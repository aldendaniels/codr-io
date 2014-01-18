define('tests/index', function(require)
{
    // Dependencies.
    var oQUnit = require('tests/qunit');
    
    // Load test suites.
    require('tests/unit-tests-OT');
    
    // HACK 1: qunit does not expect to be run asyncronously (it relies on the onload event).
    // Therefore, we have to manually call the load() method.
    // See http://elucidblue.com/2012/12/24/making-qunit-play-nice-with-requirejs/
    //
    // HACK 2: In the built mode, however, we aren't really loading qunit asynchronously
    // so "HACK 1" causes qunit.load() to be called twice. To avoid this, We detect
    // whether or not qunit has been loaded by checking to see if oQUnit.config
    // is populated.
    return function()
    {
        if (!oQUnit.config.autostart)
            oQUnit.load();  
    }
});

// Run tests.
require(['tests/index'], function(fnRunTests)
{
    fnRunTests();
});