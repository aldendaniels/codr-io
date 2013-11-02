var requirejs = require('requirejs');

function onBuildError(sError)
{
    console.log(sError);
}

requirejs.optimize(
{
    mainConfigFile: './public/javascripts/require-config.js',
    baseUrl: './public/javascripts',
    name: 'init-app',
    out: './public/build/init-app.js'
}, function(){}, onBuildError);