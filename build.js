
// Delete output dir.
var oHelpers = require('./helpers-node');
oHelpers.emptyDirSync(__dirname + '/public/build');

// RequireJS.
var requirejs = require('requirejs');

requirejs.optimize(
{
    mainConfigFile: './public/javascripts/require-config.js',
        
    baseUrl: './public/javascripts',
        
    name: 'init-app',
    
    out: './public/build/javascripts/init-app.js'
    
}, function(){}, function(sError) { console.log(sError); });

requirejs.optimize(
{
    mainConfigFile: './public/javascripts/require-config.js',
        
    baseUrl: './public/javascripts',
        
    name: 'workspace',
    
    out: './public/build/javascripts/workspace.js'
    
}, function(){}, function(sError) { console.log(sError); });

// Ace
requirejs.optimize(
{
    mainConfigFile: './public/javascripts/require-config.js',
        
    baseUrl: './public/javascripts/edit-control/ace',
            
    dir: './public/build/javascripts/edit-control/ace',
    
}, function(){}, function(sError) { console.log(sError); });