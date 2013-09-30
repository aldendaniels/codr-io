
/****************** ACE CODE ******************
 * Taken from ext-modelist.js
 **********************************************/

var g_oModes = {}; // Exports.

(function() // Closure. Added by Alden . . . used to use Ace's define().
{
    var modes = [];
    function getModeForPath(path) {
        var mode = modesByName.text;
        var fileName = path.split(/[\/\\]/).pop();
        for (var i = 0; i < modes.length; i++) {
            if (modes[i].supportsFile(fileName)) {
                mode = modes[i];
                break;
            }
        }
        return mode;
    }
    
    var Mode = function(name, caption, extensions) {
        this.name = name;
        this.caption = caption;
        this.mode = "ace/mode/" + name;
        this.extensions = extensions;
        if (/\^/.test(extensions)) {
            var re = extensions.replace(/\|(\^)?/g, function(a, b){
                return "$|" + (b ? "^" : "^.*\\.");
            }) + "$";
        } else {
            var re = "^.*\\.(" + extensions + ")$";
        }
    
        this.extRe = new RegExp(re, "gi");
    };
    
    Mode.prototype.supportsFile = function(filename) {
        return filename.match(this.extRe);
    };
    var supportedModes = {
        ABAP:        ["abap"],
        ADA:         ["ada|adb"],
        ActionScript:["as"],
        AsciiDoc:    ["asciidoc"],
        Assembly_x86:["asm"],
        AutoHotKey:  ["ahk"],
        BatchFile:   ["bat|cmd"],
        C9Search:    ["c9search_results"],
        C_Cpp:       ["c|cc|cpp|cxx|h|hh|hpp"],
        Clojure:     ["clj"],
        Cobol:       ["^CBL|COB"],
        coffee:      ["^Cakefile|coffee|cf|cson"],
        ColdFusion:  ["cfm"],
        CSharp:      ["cs"],
        CSS:         ["css"],
        Curly:       ["curly"],
        D:           ["d|di"],
        Dart:        ["dart"],
        Diff:        ["diff|patch"],
        Dot:         ["dot"],
        Erlang:      ["erl|hrl"],
        EJS:         ["ejs"],
        Forth:       ["frt|fs|ldr"],
        FreeMarker:  ["ftl"],
        Glsl:        ["glsl|frag|vert"],
        golang:      ["go"],
        Groovy:      ["groovy"],
        HAML:        ["haml"],
        Haskell:     ["hs"],
        haXe:        ["hx"],
        HTML:        ["htm|html|xhtml"],
        HTML_Ruby:   ["erb|rhtml|html.erb"],
        Ini:         ["Ini|conf"],
        Jade:        ["jade"],
        Java:        ["java"],
        JavaScript:  ["js"],
        JSON:        ["json"],
        JSONiq:      ["jq"],
        JSP:         ["jsp"],
        JSX:         ["jsx"],
        Julia:       ["jl"],
        LaTeX:       ["latex|tex|ltx|bib"],
        LESS:        ["less"],
        Liquid:      ["liquid"],
        Lisp:        ["lisp"],
        LiveScript:  ["ls"],
        LogiQL:      ["logic|lql"],
        LSL:         ["lsl"],
        Lua:         ["lua"],
        LuaPage:     ["lp"],
        Lucene:      ["lucene"],
        Makefile:    ["^GNUmakefile|^makefile|^Makefile|^OCamlMakefile|make"],
        MATLAB:      ["matlab"],
        Markdown:    ["md|markdown"],
        MySQL:       ["mysql"],
        MUSHCode:    ["mc|mush"],
        ObjectiveC:  ["m|mm"],
        OCaml:       ["ml|mli"],
        Pascal:      ["pas|p"],
        Perl:        ["pl|pm"],
        pgSQL:       ["pgsql"],
        PHP:         ["php|phtml"],
        Powershell:  ["ps1"],
        Prolog:      ["plg|prolog"],
        Properties:  ["properties"],
        Python:      ["py"],
        R:           ["r"],
        RDoc:        ["Rd"],
        RHTML:       ["Rhtml"],
        Ruby:        ["ru|gemspec|rake|rb"],
        Rust:        ["rs"],
        SASS:        ["sass"],
        SCAD:        ["scad"],
        Scala:       ["scala"],
        Scheme:      ["scm|rkt"],
        SCSS:        ["scss"],
        SH:          ["sh|bash"],
        snippets:    ["snippets"],
        SQL:         ["sql"],
        Stylus:      ["styl|stylus"],
        SVG:         ["svg"],
        Tcl:         ["tcl"],
        Tex:         ["tex"],
        Text:        ["txt"],
        Textile:     ["textile"],
        Toml:        ["toml"],
        Twig:        ["twig"],
        Typescript:  ["typescript|ts|str"],
        VBScript:    ["vbs"],
        Velocity:    ["vm"],
        XML:         ["xml|rdf|rss|wsdl|xslt|atom|mathml|mml|xul|xbl"],
        XQuery:      ["xq"],
        YAML:        ["yaml"]
    };
    
    var nameOverrides = {
        ObjectiveC: "Objective-C",
        CSharp: "C#",
        golang: "Go",
        C_Cpp: "C/C++",
        coffee: "CoffeeScript",
        HTML_Ruby: "HTML (Ruby)"
    };
    var modesByName = {};
    for (var name in supportedModes) {
        var data = supportedModes[name];
        var displayName = nameOverrides[name] || name;
        var filename = name.toLowerCase();
        var mode = new Mode(filename, displayName, data[0]);
        modesByName[filename] = mode;
        modes.push(mode);
    }
    
   /*module.exports = { Removed by AldenD.
        getModeForPath: getModeForPath,
        modes: modes,
        modesByName: modesByName
    };*/
   
    /************** BELOW CREATED BY US **************/

    // Select favorite modes.
    var aCodrFavModeNames = ['text', 'html', 'javascript', 'css', 'python', 'mysql'];
    
    var CodrMode = oHelpers.createClass(
    {
        _oAceMode: null,
        
        __init__: function(oAceMode)
        {
            this._oAceMode = oAceMode;
        },
        
        supportsFile: function(sFileName)
        {
            return this._oAceMode.supportsFile(sFileName); 
        },
        
        getName: function()
        {
            return this._oAceMode.name;  
        },
        
        getDisplayName: function()
        {
            return this._oAceMode.caption;
        },
        
        getPath: function()
        {
            return this._oAceMode.mode;
        },
        
        isFavorite: function()
        {
           return $.inArray(this.getName(), aCodrFavModeNames) != -1;
        }
    });


    // Wrap Ace's mode objects in our own.
    // Sort Favorite modes to top.
    var aCodrModes = [];
    var oCodrModesByName = {};
    for (var iModeOffset in modes)
    {
        // Push CodrMode (excluding favorites).
        var oCodrMode = new CodrMode(modes[iModeOffset]);
        if (!oCodrMode.isFavorite())
            aCodrModes.push(oCodrMode);
        
        // Map CodrMode by name.
        oCodrModesByName[oCodrMode.getName()] = oCodrMode;
    }
    
    // Prefix favorite modes to list in order.
    var aFavModes = [];
    for (var iNameOffset in aCodrFavModeNames)
    {
        var sName = aCodrFavModeNames[iNameOffset];
        var oCodrMode = oCodrModesByName[sName];
        aFavModes.push(oCodrMode);
    }
    aCodrModes = aFavModes.concat(aCodrModes);
    
    // Expose g_oModes object.
    g_oModes = { 
        
        aModes:            aCodrModes,
        oModesByName:      oCodrModesByName,
        iNumFavoriteModes: aFavModes.length,
        createModeMenu:    function(jParent, oScope, fnOnModeSelect)
        {
            return new Menu( this.aModes, jParent, this.iNumFavoriteModes, null, 
                             function(oMode) { return oMode.getName();         }, // Get key
                             function(oMode) { return oMode.getDisplayName();  }, // Get item display text.
                             oHelpers.createCallback(oScope, fnOnModeSelect)      // On Item Selection.
                        );
        }
    }
    
})();

