var oTemplate = {
    
    // Members
    _templates: {},
    
    // Methods
    init: function()
    {
        var iFailures = 0;
        $('.template').each(oHelpers.createCallback(this, function(i, eTemplate)
        {
            var jTemplate = $(eTemplate);
            var sName = jTemplate.attr('id');
            try
            {
                this._templates[sName] = this._compileTemplate(sName, jTemplate.text());    
            }
            catch(oError)
            {
                if (oError == 'TEMPLATE COMPILE ERROR')
                    iFailures++;
                else
                    throw oError;
            }
        }));
        if (iFailures)
        {
            alert(iFailures + ' templates failed to compile.\n\nSee the console log for details.');
            throw('TEMPLATE COMPILE ERROR');
        }
    },
    
    render: function(sName, oContext)
    {
        oHelpers.assert(oContext, 'Rendering context data is required.');
        var oTemplate = this._templates[sName];
        if (!oTemplate)
            alert('Invalid temlate specified: ' + sName);
        return oTemplate.render(oContext);
    },
    
    _compileTemplate: function(sName, sTemplate)
    {
        // Break the template into its raw text and evaluable commands.
        var aParts = this._splitOnCommands(sTemplate, [
            {sName: 'jsEvalEscaped',        re: /\[\[([\s\S]+?)\]\]/g}, // Dynamic Javascript resulting in HTML-escaped text
            {sName: 'jsInvoke',             re: /\[%([\s\S]+?)%\]/g},   // Dynamic Javascript invocation
            {sName: 'templateInvoke',       re: /\[!([\s\S]+?)!\]/g}    // Dynamic Template invocation
        ]);
        
        // Compile template into a Javascript string.
        sTemplate = "with(__oData){ var __s = ''";
        for (var i = 0; i < aParts.length; i++)
        {
            var oPart = aParts[i];
            if (typeof oPart == 'string')
            {
                sTemplate += " + __aParts[" + i + "]";
            }
            else if (oPart.sType == 'jsEvalEscaped')
            {
                sTemplate += " + __escapeHtml('' + " + oPart.sText + ")";
            }
            else if (oPart.sType == 'jsInvoke')
            {
                var oResult = this._translateSpecialTag(oPart.sText);
                if (oResult === false)
                {
                    console.log('\nInvalid template tag: \n\nTag: ' + oPart.sText + '\n\n');
                    throw('TEMPLATE COMPILE ERROR');                    
                }
                else
                    sTemplate += ";" + oResult + "__s = __s";
            }
            else if (oPart.sType == 'templateInvoke')
            {
                var a = oPart.sText.trim().split(' ');
                sTemplate += " + __INVTEMPLATE.render('" + a[0] + "', " + a[1] + ")";
            }
            else
                console.log('Invalid part type: ', oPart);
        }
        sTemplate += ';} return __s;';
            
        // Evaluate string as javascript, handling syntax errors.
        try
        {
            var fnRender = new Function('__oData', '__aParts', '__escapeHtml', '__INVTEMPLATE', sTemplate);   
        }
        catch(oError)
        {
            console.log(
                '\nInvalid template "' + sName + '": \n\n' +
                'Error: ' + oError.message + '\n\n' +
                'Compiled template: \n\n' + sTemplate + '\n'
            );
            throw('TEMPLATE COMPILE ERROR');
        }
        
        // Return the compiled template.
        return {
            render: oHelpers.createCallback(this, function(oData)
            {
                return fnRender(oData, aParts, this._escapeHtml, oTemplate);
            })
        }
    },
    
    _splitOnCommands: function(sTemplate, aCommands)
    {
        var aParts = [sTemplate];
        for (var iCommand = 0; iCommand < aCommands.length; iCommand++)
        {
            var oCommand = aCommands[iCommand];
            for (var iPart = 0; iPart < aParts.length; iPart++)
            {
                var oPart = aParts[iPart];
                if (typeof oPart == 'string')
                    iPart = this._splitOnCommand(aParts, iPart, oCommand);
            }
        }
        return aParts;
    },
    
    _splitOnCommand: function(aParts, iPart, oCommand)
    {
        var sTemplate = aParts[iPart];
        var aMatches = sTemplate.match(oCommand.re) || [];
        var aSubParts = [];
        for (var i = 0; i < aMatches.length; i++)
        {
            // Get the match.
            var sMatch = aMatches[i];
            var iMatchStart = sTemplate.search(oCommand.re);
            var iMatchEnd = iMatchStart + sMatch.length;
            
            // Capture unmatched.
            if (iMatchStart > 0)
                aSubParts.push(sTemplate.slice(0, iMatchStart));
            
            // Capture match.
            var sCapture = sMatch.replace(oCommand.re, function(s, c){return c});
            aSubParts.push({sType: oCommand.sName, sText: sCapture});
            
            // Handle remainder.
            sTemplate = sTemplate.slice(iMatchEnd);
        }
        
        // Capture remaning text and inject rsults into aParts.
        if (aMatches.length)
        {
            aSubParts.push(sTemplate);
            aParts.splice.apply(aParts, [iPart, 1].concat(aSubParts));
        }
        
        // Return the ending index so we don't re-parse these results.
        return iPart + aSubParts.length;            
    },
    
    _translateSpecialTag: function(sJS)
    {
        // Close block on END tag.
        sTrimmedJS = sJS.trim();
        if (sTrimmedJS == 'end')
            return '}';
        
        // Handle for loop.
        // NOTE: The first catpure is everything.
        var aCapture = /^for ([\s\S]+?) in ([\s\S]+?)$/.exec(sTrimmedJS);
        if (aCapture)
        {
            return 'for (var i = 0; i < ' + aCapture[2] + '.length; i++)' + 
            '{ var ' + aCapture[1] + ' = ' + aCapture[2] + '[i];'; 
        }

        // Handle if.
        var aCapture = /^if ([\s\S]+?)$/.exec(sTrimmedJS);
        if (aCapture)
            return 'if (' + aCapture[1] + '){';

        // Handle "else if".
        var aCapture = /^else if ([\s\S]+?)$/.exec(sTrimmedJS);
        if (aCapture)
            return '} else if (' + aCapture[1] + '){';

        // Handle "else".
        if (sTrimmedJS == 'else')
            return '}else{'
        
        // Error on unhandled tag.
        return false;
    },
    
    // Adapted from Underscore.js 1.3.3 (MIT license).
    _escapeHtml: function(sText)
    {
        // List of HTML entities for escaping.
        var reHtmlEscaper = /[&<>"'\/]/g;
        var oHtmlEscapes = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '/': '&#x2F;'
        };
        
        // Escape a string for HTML interpolation.
        return (sText).replace(reHtmlEscaper, function(sMatch)
        {
            return oHtmlEscapes[sMatch];
        });
    }
};