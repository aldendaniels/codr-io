var oHelpers = require('./helpers-node');
var oFS = require('fs');
var oLESS = require('less');
var requirejs = require('requirejs');
var mkdirp = require('mkdirp');

// Delete output dir.
oHelpers.emptyDirSync(__dirname + '/public/build');

// OnError handler function
function handleError(e)
{
    if (e) throw e;
}

// Get arguments.
var oArgs = {
    fast: false
};
for (var i = 2; i < process.argv.length; i++)
{
    var aParts = process.argv[i].split('=');
    oArgs[aParts[0].trim()] = aParts[1].trim();
}

////////////// RequireJS. /////////////////

function compileJS(sName, include)
{
    var oOptions = {
        
        mainConfigFile: './public/javascripts/require-config.js',
            
        baseUrl: './public/javascripts',
            
        name: 'init-app',
        
        out: './public/build/javascripts/' + sName + '.js',
        
        include: include || [],
        
        preserveLicenseComments: false,
        
        optimize: (oArgs.fast ? 'none': 'uglify')
    };
    requirejs.optimize(oOptions, handleError);
}

// Init-Aapp.
compileJS('init-app', ['lib/require', 'require-config']);

// Workspace.
compileJS('workspace', ['lib/require', 'require-config']);

// Ace
requirejs.optimize(
{
    mainConfigFile: './public/javascripts/require-config.js',
        
    baseUrl: './public/javascripts/edit-control/ace',
            
    dir: './public/build/javascripts/edit-control/ace',
    
    exclude: ['ace'],
    
    optimize: (oArgs.fast ? 'none': 'uglify')
    
}, function(){}, handleError);



// CSS.
function complileLESS(sDirIn, sFilename)
{
    // Paths.
    var sDirOut  = sDirIn.replace('public/', 'public/build/');
    var sPathIn  = sDirIn  + '/' + sFilename;
    var sPathOut = sDirOut + '/' + sFilename.replace('.less', '.css');
    
    // Read input file.
    var sStr = String(oFS.readFileSync(sPathIn));
    
    // Run LESS parser.
    var oParser = new oLESS.Parser(
    {
        filename: sPathIn, // Used for error reporting.
        paths: ['./public/stylesheets/']
    });
    oParser.parse(sStr, function(e, oTree)
    {
        handleError(e);
        
        // Create the output dir.
        mkdirp(sDirOut, handleError);
        
        // Write CSS.
        var sCSS = oTree.toCSS({compress: true});
        oFS.writeFileSync(sPathOut, sCSS, {}, handleError);
    });
}

complileLESS('./public/stylesheets', 'index.less');