var oHelpers = require('./helpers-node');
var oFS = require('fs');
var oLESS = require('less');
var requirejs = require('requirejs');
var ncp = require('ncp').ncp;

// Get arguments.
var oArgs = (
{
    fast: false
});
for (var i = 2; i < process.argv.length; i++)
{
    var aParts = process.argv[i].split('=');
    oArgs[aParts[0].trim()] = aParts[1].trim();
}

// OUPUT DIR
var sOutputDir = __dirname + '/public_build';

// Delete output dir.
console.log('Empty ouput dir');
oHelpers.emptyDirSync(sOutputDir);

function handleError(e)
{
    if (e) throw e;
}

function complileLESS(sDirIn, sFilename, fnCallback)
{
    // Paths.
    var sDirOut  = sDirIn.replace('public/', 'public_build' + '/');
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
        var sCSS = oTree.toCSS({compress: true});
        oFS.writeFileSync(sPathOut, sCSS, {}, handleError);
        fnCallback();
    });
}

function compileJS(sName, oExtraOptions, fnCallback)
{
    var oOptions = {
        
        mainConfigFile: './public/javascripts/require-config.js',
            
        baseUrl: './public/javascripts',
            
        name: sName,
        
        out: sOutputDir + '/javascripts/' + sName + '.js',
        
        preserveLicenseComments: false,
        
        optimize: (oArgs.fast ? 'none': 'uglify'),
        
    };
    oHelpers.extendObj(oOptions, oExtraOptions);
    requirejs.optimize(oOptions, fnCallback, handleError);
}

var aTasks = [

    function()
    {
        console.log('Compile init-app.js');
        compileJS('init-app',
        {
            include: ['require-config']
        }, fnNext);
    },
    
    function()
    {
        console.log('Compile app-main.js');
        compileJS('app-main',
        {
            exclude: ['init-app'],
        }, fnNext);
    },
    
    function()
    {
        console.log('Compile preview-standalone.js');
        compileJS('preview-standalone',
        {
            include: ['require-config']
        }, fnNext);        
    },
    
    function()
    {
        console.log('Compile tests/index.js');
        compileJS('tests/index',
        {
            include: ['require-config']
        }, fnNext);
    },
    
    function()
    {
        console.log('Copy ace JS files.');
        oFS.mkdir(sOutputDir + '/javascripts/edit-control')
        ncp('./public/javascripts/edit-control/ace',
            sOutputDir + '/javascripts/edit-control/ace',
            {
            },
            fnNext
        );
    },
   
    function()
    {
        console.log('Copy jquery.js and require.js');
        ncp('./public/javascripts/lib',
            sOutputDir + '/javascripts/lib',
            {
                filter: function(sFileName)
                {
                    return oHelpers.strEndsWith(sFileName, '\lib') ||
                           oHelpers.strEndsWith(sFileName, 'jquery.js') ||
                           oHelpers.strEndsWith(sFileName, 'require.js');
                }
            },
            fnNext
        );
    },
    
    function()
    {
        console.log('Compile index.less');
        oFS.mkdirSync(sOutputDir + '/stylesheets', function(e){});
        complileLESS('./public/stylesheets', 'index.less', fnNext);
    },
    
    function()
    {
        console.log('Compile HTML files');
        var aFileNames = ['index.html', 'tests.html', 'preview.html'];
        for(var i in aFileNames)
        {
            var sFileName = aFileNames[i];
            r = /<!--START_DEV_ONLY-->(.|\n|\r)*<!--END_DEV_ONLY-->/g;
            var sFileContent = String(oFS.readFileSync('./public/' + sFileName)).replace(r, '');
            oFS.writeFileSync(sOutputDir + '/' + sFileName, sFileContent, {}, handleError);
        }
        fnNext();
    },
    
    function()
    {
        console.log('Copy other files');
        
        oFS.mkdirSync(sOutputDir + '/images', function(e){});
        aFileNames = ['stylesheets/qunit.css', 'images/favicon.ico'];
        for(var i in aFileNames)
        {
            var sFileName = aFileNames[i];
            oFS.createReadStream('./public/' + sFileName).pipe(oFS.createWriteStream(sOutputDir + '/' + sFileName));
        }
        fnNext();
    },
    
    function()
    {
        console.log('Compress');
        var oZLib = require('zlib');
        ncp('./public_build', sOutputDir + '_compressed',
        {
            transform: function(read, write)
            {
                read.pipe(new oZLib.Gzip()).pipe(write);
            }
        }, fnNext);
    },
    
    function()
    {
        console.log('Replace uncompressed files');
        oHelpers.emptyDirSync(sOutputDir);
        oFS.rmdirSync(sOutputDir);
        
        // Timeout avoids collision with rmdirSync. Otherwise
        // we get occasional EPERM errors (at least on Windows).
        setTimeout(function() 
        {
            oFS.renameSync(sOutputDir + '_compressed', sOutputDir);
        }, 10);
    }
];

// Run tasks
var iCurTask = 0;
function fnNext()
{
    iCurTask++;
    if (iCurTask < aTasks.length)
        aTasks[iCurTask]();
}
aTasks[iCurTask]();
