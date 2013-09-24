var AceDocument = new ace.require('ace/document').Document;
var AceRange = new ace.require('ace/range').Range;

///////////////////////////////////////////////////////////////////////////////
//                                 Single Line                               //
///////////////////////////////////////////////////////////////////////////////

///////////////////// X before Y
_test(
    'Single Line - Insert before Insert',
    'Y', 'Yay!',
    {
        action: 'insertText',
        range: new AceRange(0, 1, -1, -1),
        text: 'a'
        
    },
    {
        action: 'insertText',
        range: new AceRange(0, 1, -1, -1),
        text: 'y!'
    }
);

_test(
    'Single Line - Insert before Delete',
    'YX', 'Yay!',
    {
        action: 'insertText',
        range: new AceRange(0, 1, -1, -1),
        text: 'ay!'
        
    },
    {
        action: 'removeText',
        range: new AceRange(0, 1, 0, 2)
    }
);

_test(
    'Single Line - Delete before Delete',
    '12Yay!', 'Yay!',
    {
        action: 'removeText',
        range: new AceRange(0, 0, 0, 1) //Remove '1'
        
    },
    {
        action: 'removeText',
        range: new AceRange(0, 1, 0, 2) // Remove '2'
    }
);

_test(
    'Single Line - Delete before Insert',
    '1ay!', 'Yay!',
    {
        action: 'removeText',
        range: new AceRange(0, 0, 0, 1) //Remove '1'
        
    },
    {
        action: 'insertText',
        range: new AceRange(0, 1, -1, -1), // Insert 'Y'
        text: 'Y'
    }
);

///////////////////// X and Y ends overlap
// This means that x is a deletion.
// y is also a deletion, because when y in an insert it falls under the "x wraps y" category.

_test(
    'Single Line - Delete end overlaps Delete start',
    '123Yay!', 'Yay!',
    {
        action: 'removeText',
        range: new AceRange(0, 0, 0, 2) //Remove '12'
        
    },
    {
        action: 'removeText',
        range: new AceRange(0, 1, 0, 3) // Remove '23'
    }
);

_test(
    'Single Line - Delete start overlaps Delete end',
    '123Yay!', 'Yay!',
    {
        action: 'removeText',
        range: new AceRange(0, 1, 0, 3) //Remove '23'
        
    },
    {
        action: 'removeText',
        range: new AceRange(0, 0, 0, 2) // Remove '12'
    }
);

///////////////////// X wraps Y
// This means that x is a deletion.

_test(
    'Single Line - Delete overlaps Insert',
    '12ay!', 'Yay!',
    {
        action: 'removeText',
        range: new AceRange(0, 0, 0, 2) //Remove '12'
        
    },
    {
        action: 'insertText',
        range: new AceRange(0, 1, -1, -1), // Insert 'Y' between 1 and 2
        text: 'Y'
    }
);

_test(
    'Single Line - Delete overlaps Delete',
    '123Yay!', 'Yay!',
    {
        action: 'removeText',
        range: new AceRange(0, 0, 0, 3) //Remove '123'
    },
    {
        action: 'removeText',
        range: new AceRange(0, 1, 0, 2) // Remove '2'
    }
);

///////////////////// X contained by Y
// This means that y is a deletion.
_test(
    'Single Line - Delete contained by Delete',
    '123Yay!', 'Yay!',
    {
        action: 'removeText',
        range: new AceRange(0, 1, 0, 2) //Remove '2'
    },
    {
        action: 'removeText',
        range: new AceRange(0, 0, 0, 3) // Remove '123'
    }
);

_test(
    'Single Line - Insert contained by Delete',
    '13Yay!', 'Yay!',
    {
        action: 'insertText',
        range: new AceRange(0, 1, -1, -1), //Insert '2'
        text: '2'
    },
    {
        action: 'removeText',
        range: new AceRange(0, 0, 0, 2) // Remove '13'
    }
);

///////////////////// X after Y
// No OT!
_test(
    'Single Line - Insert is after Insert',
    'ay', 'Yay!',
    {
        action: 'insertText',
        range: new AceRange(0, 2, -1, -1), //Insert '!'
        text: '!'
    },
    {
        action: 'insertText',
        range: new AceRange(0, 0, -1, -1), // Insert 'Y'
        text: 'Y'
    }
);

_test(
    'Single Line - Insert is after Delete',
    'YayX', 'Yay!',
    {
        action: 'insertText',
        range: new AceRange(0, 4, -1, -1), //Insert '!'
        text: '!'
    },
    {
        action: 'removeText',
        range: new AceRange(0, 3, 0, 4) // Remove 'X'
    }
);

_test(
    'Single Line - Delete is after Insert',
    'YayX', 'Yay!',
    {
        action: 'removeText',
        range: new AceRange(0, 3, 0, 4) // Remove 'X'
    },
    {
        action: 'insertText',
        range: new AceRange(0, 3, -1, -1), //Insert '!'
        text: '!'
    }
);

_test(
    'Single Line - Delete is after Delete',
    'Yay!XY', 'Yay!',
    {
        action: 'removeText',
        range: new AceRange(0, 5, 0, 6) // Remove 'Y'
    },
    {
        action: 'removeText',
        range: new AceRange(0, 4, 0, 5) // Remove 'X'
    }
);

///////////////////////////////////////////////////////////////////////////////
//                      Multi line vanila                                    //
///////////////////////////////////////////////////////////////////////////////

///////////////////// X before Y
_test(
    'Multi line vanila - Insert before Insert',
    'Three\n', 'One\nTwo\nThree\n',
    {
        action: 'insertLines',
        range: new AceRange(0, -1, -1, -1), // Insert One
        lines: ['One'],
        nl: '\n'
    },
    {
        action: 'insertLines',
        range: new AceRange(0, -1, -1, -1), // Insert Two
        lines: ['Two'],
        nl: '\n'
    }
);

_test(
    'Multi line vanila - Insert before Delete',
    'One\nThree\n', 'One\nTwo\n',
    {
        action: 'insertLines',
        range: new AceRange(1, -1, -1, -1), // Insert Two
        lines: ['Two'],
        nl: '\n'
    },
    {
        action: 'removeLines',
        range: new AceRange(1, -1, 2, -1) // Delete Three
    }
);

_test(
    'Multi line vanila - Delete before Delete',
    'One\nTwo\nThree\n', 'Three\n',
    {
        action: 'removeLines',
        range: new AceRange(0, -1, 1, -1) // Delete One
    },
    {
        action: 'removeLines',
        range: new AceRange(1, -1, 2, -1) // Delete Two
    }
);

_test(
    'Multi line vanila - Delete before Insert',
    'Delete\n', 'Insert\n',
    {
        action: 'removeLines',
        range: new AceRange(0, -1, 1, -1) // Delete
    },
    {
        action: 'insertLines',
        range: new AceRange(1, -1, -1, -1), // Insert
        lines: ['Insert'],
        nl: '\n'
    }
);


///////////////////// X and Y ends overlap
_test(
    'Multi line vanila - Delete end overlaps Delete start',
    '0\n1\n2\n3\n4\n', '0\n4\n',
    {
        action: 'removeLines',
        range: new AceRange(1, -1, 3, -1)
    },
    {
        action: 'removeLines',
        range: new AceRange(2, -1, 4, -1)
    }
);

_test(
    'Multi line vanila - Delete start overlaps Delete end',
    '0\n1\n2\n3\n4\n', '0\n4\n',
    {
        action: 'removeLines',
        range: new AceRange(2, -1, 4, -1)
    },
    {
        action: 'removeLines',
        range: new AceRange(1, -1, 3, -1)
    }
);


///////////////////// X wraps Y
_test(
    'Multi line vanila - Delete overlaps insert',
    '0\n2\n3\n', 'hi\n3\n',
    {
        action: 'removeLines',
        range: new AceRange(0, -1, 2, -1)
    },
    {
        action: 'insertLines',
        range: new AceRange(1, -1, -1, -1),
        lines: ['hi'],
        nl: '\n'
    }
);

_test(
    'Multi line vanila - Delete overlaps Delete',
    '0\n2\n3\n4\n5\n', '0\n5\n',
    {
        action: 'removeLines',
        range: new AceRange(1, -1, 4, -1)
    },
    {
        action: 'removeLines',
        range: new AceRange(2, -1, 3, -1)
    }
);


///////////////////// X contained by Y
_test(
    'Multi line vanila - Delete contained by Delete',
    '0\n2\n3\n4\n5\n', '0\n5\n',
    {
        action: 'removeLines',
        range: new AceRange(2, -1, 3, -1)
    },
    {
        action: 'removeLines',
        range: new AceRange(1, -1, 4, -1)
    }
);

_test(
    'Multi line vanila - Insert contained by Delete',
    '0\n2\n3\n', '3\n',
    {
        action: 'insertLines',
        range: new AceRange(1, -1, -1, -1),
        lines: ['hi'],
        nl: '\n'
    },
    {
        action: 'removeLines',
        range: new AceRange(0, -1, 2, -1)
    }
);


///////////////////// X after Y
_test(
    'Multi line vanila - Insert is after Insert',
    '1\n', '0\n1\n2\n',
    {
        action: 'insertLines',
        range: new AceRange(1, -1, -1, -1),
        lines: ['2'],
        nl: '\n'
    },
    {
        action: 'insertLines',
        range: new AceRange(0, -1, -1, -1),
        lines: ['0'],
        nl: '\n'
    }
);

_test(
    'Multi line vanila - Insert is after Delete',
    '1\n2\n', '1\n3\n',
    {
        action: 'insertLines',
        range: new AceRange(2, -1, -1, -1),
        lines: ['3'],
        nl: '\n'
    },
    {
        action: 'removeLines',
        range: new AceRange(1, -1, 2, -1)
    }
);

_test(
    'Multi line vanila - Delete is after Insert',
    '1\n2\n', '1\n3\n',
    {
        action: 'removeLines',
        range: new AceRange(1, 0, 2, -1)
    },
    {
        action: 'insertLines',
        range: new AceRange(2, -1, -1, -1),
        lines: ['3'],
        nl: '\n'
    }
);

_test(
    'Multi line vanila - Delete is after Delete',
    '1\n2\n3\n', '1\n',
    {
        action: 'removeLines',
        range: new AceRange(2, -1, 3, -1)
    },
    {
        action: 'removeLines',
        range: new AceRange(1, -1, 2, -1)
    }
);


///////////////////////////////////////////////////////////////////////////////
//                                 Multi Line                                //
///////////////////////////////////////////////////////////////////////////////


///////////////////// X before Y
_test(
    'Multi line - Insert before Insert',
    'a2', 'ab\n123\nA',
    {
        action: 'insertText',
        range: new AceRange(0, 1, -1, -1),
        text: 'b\n1'
    },
    {
        action: 'insertText',
        range: new AceRange(0, 2, -1, -1),
        text: '3\nA'
    }
);

_test(
    'Multi line - Insert before Delete',
    'a2A', 'ab\n1A',
    {
        action: 'insertText',
        range: new AceRange(0, 1, -1, -1),
        text: 'b\n1'
    },
    {
        action: 'removeText',
        range: new AceRange(0, 1, 0, 2)
    }
);

_test(
    'Multi line - Delete before Delete',
    '1a\nb2c\nd3\n', '123\n',
    {
        action: 'removeText',
        range: new AceRange(0, 1, 1, 1)
    },
    {
        action: 'removeText',
        range: new AceRange(1, 2, 2, 1)
    }
);

_test(
    'Multi line - Delete before Insert',
    '1a\nb2\n', '123\n',
    {
        action: 'removeText',
        range: new AceRange(0, 1, 1, 1)
    },
    {
        action: 'insertText',
        range: new AceRange(1, 2, -1, -1),
        text: '3'
    }
);

///////////////////// X and Y ends overlap

_test(
    'Multi line - Delete end overlaps Delete start',
    '1a\nb2\nd2\n', '12\n',
    {
        action: 'removeText',
        range: new AceRange(0, 1, 1, 2)
    },
    {
        action: 'removeText',
        range: new AceRange(1, 0, 2, 1)
    }
);

_test(
    'Multi line - Delete end overlaps Insert start',
    '1a\nb\n', '12\n3\n',
    {
        action: 'removeText',
        range: new AceRange(0, 1, 1, 1)
    },
    {
        action: 'insertText',
        range: new AceRange(1, 1, -1, -1),
        text: '2\n3'
    }
);

///////////////////// X wraps Y 

_test(
    'Multi line - Delete wraps Insert',
    '1a\nb3\n', '123\n',
    {
        action: 'removeText',
        range: new AceRange(0, 1, 1, 1)
    },
    {
        action: 'insertText',
        range: new AceRange(1, 0, -1, -1),
        text: '2'
    }
);

_test(
    'Multi line - Delete wraps delete',
    '1ab\nc2\n', '12\n',
    {
        action: 'removeText',
        range: new AceRange(0, 1, 1, 1)
    },
    {
        action: 'removeText',
        range: new AceRange(0, 2, 0, 3)
    }
);

///////////////////// X contained by Y

_test(
    'Multi line - Delete contained by delete',
    '1ab\nc2\n', '12\n',
    {
        action: 'removeText',
        range: new AceRange(0, 2, 0, 3)
    },
    {
        action: 'removeText',
        range: new AceRange(0, 1, 1, 1)
    }
);

_test(
    'Multi line - Insert contained by Delete',
    '1a\nb2\n', '12\n',
    {
        action: 'insertText',
        range: new AceRange(0, 2, -1, -1),
        text: 'X'
    },
    {
        action: 'removeText',
        range: new AceRange(0, 1, 1, 1)
    }
);


///////////////////// X after Y

_test(
    'Multi line - Insert after Delete',
    '1\n2a\n', '1\n23\n',
    {
        action: 'insertText',
        range: new AceRange(1, 2, -1, -1),
        text: '3'
    },
    {
        action: 'removeText',
        range: new AceRange(1, 1, 1, 2)
    }
);

function _test(sTestName, sStart, sEnd, oPrevDelta, oDelta)
{
    test(sTestName, function()
    {
        var oDocument = new AceDocument(sStart);
        oDelta = transformAceDelta(getTransOpFromAceDelta(oPrevDelta), oDelta);
        oDocument.applyDeltas([oPrevDelta, oDelta]);
        equal(oDocument.getValue(), sEnd);        
    });
}
