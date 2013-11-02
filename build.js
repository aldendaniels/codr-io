
// Delete output dir.
var oHelpers = require('./helpers-node');
oHelpers.emptyDirSync(__dirname + '/public/build');

// RequireJS.
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

// ACE.
var oAceBuilder = require('./public/javascripts/edit-control/ace/Makefile.dryice');
oAceBuilder.buildAce(
{
    targetDir: __dirname + '/public/build/ace',
    compress: true,
});