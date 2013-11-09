var aDependencies =
[
    // Load jQUnit.
    'tests/qunit',
    
    // Load test suites.
    'tests/unit-tests-OT'
];

// Run tests.
require(aDependencies, function(oQUnit)
{
    // jQunit does not expect to be run asyncronously
    // (it relies on the onload event). Therefore,
    // we have to manually call the load() method.
    // See http://elucidblue.com/2012/12/24/making-qunit-play-nice-with-requirejs/
    oQUnit.load();
});