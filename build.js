var oHelpers = require('./helpers-node');
var oFS = require('fs');
var oLESS = require('less');
var requirejs = require('requirejs');
var mkdirp = require('mkdirp');
var ncp = require('ncp').ncp;

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

////////////// JS COMPILATION /////////////////

function compileJS(sName, oExtraOptions)
{
    var oOptions = {
        
        mainConfigFile: './public/javascripts/require-config.js',
            
        baseUrl: './public/javascripts',
            
        name: sName,
        
        out: './public/build/javascripts/' + sName + '.js',
        
        preserveLicenseComments: false,
        
        optimize: (oArgs.fast ? 'none': 'uglify')
        
    };
    oHelpers.extendObj(oOptions, oExtraOptions);
    requirejs.optimize(oOptions, handleError);
}

// Init-Aapp.
compileJS('init-app',
{
    include: ['lib/require', 'require-config']
});

// Workspace.
compileJS('workspace',
{
    exclude: ['init-app'],
});

// Ace.
requirejs.optimize({
    
    mainConfigFile: './public/javascripts/require-config.js',
        
    baseUrl: './public/javascripts/edit-control/ace',
    
    dir: './public/build/javascripts/ace',
                        
    fileExclusionRegExp: /^ace.js$/, // Already built into workspace.js
   
    preserveLicenseComments: false,
    
    optimize: (oArgs.fast ? 'none': 'uglify')
    
}, handleError);


////////////// LESS COMPILATION /////////////////

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

////////////// HTML COMPILATION /////////////////
var stream = require('stream');
function createTransform()
{
    var transform = new stream.Transform();
    transform._transform = function(chunk, encoding, done)
    {
        r = /<!--START_DEV_ONLY-->(.|\n|\r)*<!--END_DEV_ONLY-->/g;
        s = chunk.toString().replace(r, '');
        this.push(s);
        done();
    }
    return transform;
}


var bIsDevOnly = false;
ncp('./public/html', './public/build/html',
{
    transform: function(read, write)
    {
        var transform = createTransform();
        read.pipe(transform).pipe(write);
    }
}, handleError);