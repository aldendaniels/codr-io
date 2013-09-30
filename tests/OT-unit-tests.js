
///////////////////////////////////////////////////////////////////////////////
//                                 Single Line                               //
///////////////////////////////////////////////////////////////////////////////

///////////////////// X before Y
_test(
    'Single Line - Insert before Insert',
    ['Y'], ['Yay!'],
    {
        sAction: 'insert',
        oRange: r(0, 1, 0, 2),
        aLines: ['a']
        
    },
    {
        sAction: 'insert',
        oRange: r(0, 1, 0, 3),
        aLines: ['y!']
    }
);

_test(
    'Single Line - Insert before Delete',
    ['YX'], ['Yay!'],
    {
        sAction: 'insert',
        oRange: r(0, 1, 0, 4),
        aLines: ['ay!']
        
    },
    {
        sAction: 'delete',
        oRange: r(0, 1, 0, 2)
    }
);

_test(
    'Single Line - Delete before Delete',
    ['12Yay!'], ['Yay!'],
    {
        sAction: 'delete',
        oRange: r(0, 0, 0, 1) //Remove '1'
        
    },
    {
        sAction: 'delete',
        oRange: r(0, 1, 0, 2) // Remove '2'
    }
);

_test(
    'Single Line - Delete before Insert',
    ['1ay!'], ['Yay!'],
    {
        sAction: 'delete',
        oRange: r(0, 0, 0, 1) //Remove '1'
        
    },
    {
        sAction: 'insert',
        oRange: r(0, 1, 0, 2), // Insert 'Y'
        aLines: ['Y']
    }
);

///////////////////// X and Y ends overlap
// This means that x is a deletion.
// y is also a deletion, because when y in an insert it falls under the "x wraps y" category.

_test(
    'Single Line - Delete end overlaps Delete start',
    ['123Yay!'], ['Yay!'],
    {
        sAction: 'delete',
        oRange: r(0, 0, 0, 2),
        aLines: ['12']   
    },
    {
        sAction: 'delete',
        oRange: r(0, 1, 0, 3),
        aLines: ['23']
    }
);

_test(
    'Single Line - Delete start overlaps Delete end',
    ['123Yay!'], ['Yay!'],
    {
        sAction: 'delete',
        oRange: r(0, 1, 0, 3),
        aLines: ['23']
        
    },
    {
        sAction: 'delete',
        oRange: r(0, 0, 0, 2),
        aLines: ['12']
    }
);

///////////////////// X wraps Y
// This means that x is a deletion.

_test(
    'Single Line - Delete overlaps Insert',
    ['12ay!'], ['Yay!'],
    {
        sAction: 'delete',
        oRange: r(0, 0, 0, 2),
        aLines: ['12']
    },
    {
        sAction: 'insert',
        oRange: r(0, 1, 0, 2), // Insert 'Y' between 1 and 2
        aLines: ['Y']
    }
);

_test(
    'Single Line - Delete overlaps Delete',
    ['123Yay!'], ['Yay!'],
    {
        sAction: 'delete',
        oRange: r(0, 0, 0, 3),
        aLines: ['123']
    },
    {
        sAction: 'delete',
        oRange: r(0, 1, 0, 2),
        aLines:  ['2']
    }
);

///////////////////// X contained by Y
// This means that y is a deletion.
_test(
    'Single Line - Delete contained by Delete',
    ['123Yay!'], ['Yay!'],
    {
        sAction: 'delete',
        oRange: r(0, 1, 0, 2),
        aLines: ['2']
    },
    {
        sAction: 'delete',
        oRange: r(0, 0, 0, 3),
        aLines: ['123']
    }
);

_test(
    'Single Line - Insert contained by Delete',
    ['13Yay!'], ['Yay!'],
    {
        sAction: 'insert',
        oRange: r(0, 1, 0, 2), //Insert '2'
        aLines: ['2']
    },
    {
        sAction: 'delete',
        oRange: r(0, 0, 0, 2),
        aLines: ['13']
    }
);

///////////////////// X after Y
// No OT!
_test(
    'Single Line - Insert is after Insert',
    ['ay'], ['Yay!'],
    {
        sAction: 'insert',
        oRange: r(0, 2, 0, 3), //Insert '!'
        aLines: ['!']
    },
    {
        sAction: 'insert',
        oRange: r(0, 0, 0, 1), // Insert 'Y'
        aLines: ['Y']
    }
);

_test(
    'Single Line - Insert is after Delete',
    ['YayX'], ['Yay!'],
    {
        sAction: 'insert',
        oRange: r(0, 4, 0, 5),
        aLines: ['!']
    },
    {
        sAction: 'delete',
        oRange: r(0, 3, 0, 4),
        aLines: ['X']
    }
);

_test(
    'Single Line - Delete is after Insert',
    ['YayX'], ['Yay!'],
    {
        sAction: 'delete',
        oRange: r(0, 3, 0, 4),
        aLinex: ['X']
    },
    {
        sAction: 'insert',
        oRange: r(0, 3, 0, 4),
        aLines: ['!']
    }
);

_test(
    'Single Line - Delete is after Delete',
    ['Yay!XY'], ['Yay!'],
    {
        sAction: 'delete',
        oRange: r(0, 5, 0, 6),
        aLines: ['Y']
    },
    {
        sAction: 'delete',
        oRange: r(0, 4, 0, 5),
        aLines: ['X']
    }
);

///////////////////////////////////////////////////////////////////////////////
//                      Multi line vanila                                    //
///////////////////////////////////////////////////////////////////////////////

///////////////////// X before Y
_test(
    'Multi line vanila - Insert before Insert',
    ['Three', ''], ['One', 'Two', 'Three', ''],
    {
        sAction: 'insert',
        oRange: r(0, 0, 1, 0),
        aLines: ['One', '']
    },
    {
        sAction: 'insert',
        oRange: r(0, 0, 1, 0),
        aLines: ['Two', '']
    }
);

_test(
    'Multi line vanila - Insert before Delete',
    ['One', 'Three', ''], ['One', 'Two', ''],
    {
        sAction: 'insert',
        oRange: r(1, 0, 2, 0),
        aLines: ['Two', '']
    },
    {
        sAction: 'delete',
        oRange: r(1, 0, 2, 0),
        aLines: ['Three', '']
    }
);

_test(
    'Multi line vanila - Delete before Delete',
    ['One', 'Two', 'Three', ''], ['Three', ''],
    {
        sAction: 'delete',
        oRange: r(0, 0, 1, 0),
        aLines: ['One', '']
    },
    {
        sAction: 'delete',
        oRange: r(1, 0, 2, 0),
        aLines: ['Two', '']
    }
);

_test(
    'Multi line vanila - Delete before Insert',
    ['Delete', ''], ['Insert', ''],
    {
        sAction: 'delete',
        oRange: r(0, 0, 1, 0),
        aLines: ['Delete', '']
    },
    {
        sAction: 'insert',
        oRange: r(1, 0, 2, 0),
        aLines: ['Insert', '']
    }
);


///////////////////// X and Y ends overlap
_test(
    'Multi line vanila - Delete end overlaps Delete start',
    ['0', '1', '2', '3', '4', ''], ['0', '4', ''],
    {
        sAction: 'delete',
        oRange: r(1, 0, 3, 0),
        aLines: ['1', '2', '']
    },
    {
        sAction: 'delete',
        oRange: r(2, 0, 4, 0),
        aLines: ['2', '3', '']
    }
);

_test(
    'Multi line vanila - Delete start overlaps Delete end',
    ['0', '1', '2', '3', '4', ''], ['0', '4', ''],
    {
        sAction: 'delete',
        oRange: r(2, 0, 4, 0),
        aLines: ['2', '3', '']
    },
    {
        sAction: 'delete',
        oRange: r(1, 0, 3, 0),
        aLines: ['1', '2', '']
    }
);


///////////////////// X wraps Y
_test(
    'Multi line vanila - Delete overlaps insert',
    ['0', '1', '2', ''], ['hi', '2', ''],
    {
        sAction: 'delete',
        oRange: r(0, 0, 2, 0),
        aLines: ['1', '2', '']
    },
    {
        sAction: 'insert',
        oRange: r(1, 0, 2, 0),
        aLines: ['hi', ''],
    }
);

_test(
    'Multi line vanila - Delete overlaps Delete',
    ['0', '1', '2', '3', '4', ''], ['0', '4', ''],
    {
        sAction: 'delete',
        oRange: r(1, 0, 4, 0),
        aLines: ['1', '2', '3', '']
    },
    {
        sAction: 'delete',
        oRange: r(2, 0, 3, 0),
        aLines: ['2', '']
    }
);


///////////////////// X contained by Y
_test(
    'Multi line vanila - Delete contained by Delete',
    ['0', '1', '2', '3', '4', ''], ['0', '4', ''],
    {
        sAction: 'delete',
        oRange: r(2, 0, 3, 0),
        aLines: ['2', '']
    },
    {
        sAction: 'delete',
        oRange: r(1, 0, 4, 0),
        aLines: ['1', '2', '3', '']
    }
);

_test(
    'Multi line vanila - Insert contained by Delete',
    ['0', '1', '2', ''], ['2', ''],
    {
        sAction: 'insert',
        oRange: r(1, 0, 2, 0),
        aLines: ['hi', ''],
    },
    {
        sAction: 'delete',
        oRange: r(0, 0, 2, 0),
        aLines: ['0', '1', '']
    }
);


///////////////////// X after Y
_test(
    'Multi line vanila - Insert is after Insert',
    ['1', ''], ['0', '1', '2', ''],
    {
        sAction: 'insert',
        oRange: r(1, 0, 2, 0),
        aLines: ['2', '']
    },
    {
        sAction: 'insert',
        oRange: r(0, 0, 1, 0),
        aLines: ['0', '']
    }
);

_test(
    'Multi line vanila - Insert is after Delete',
    ['0', '1', ''], ['0', '2', ''],
    {
        sAction: 'insert',
        oRange: r(2, 0, 3, 0),
        aLines: ['2', '']
    },
    {
        sAction: 'delete',
        oRange: r(1, 0, 2, 0),
        aLines: ['1', '']
    }
);

_test(
    'Multi line vanila - Delete is after Insert',
    ['0', '1', ''], ['0', '2', ''],
    {
        sAction: 'delete',
        oRange: r(1, 0, 2, 0),
        aLines: ['1', '']
    },
    {
        sAction: 'insert',
        oRange: r(2, 0, 3, 0),
        aLines: ['2', '']
    }
);

_test(
    'Multi line vanila - Delete is after Delete',
    ['0', '1', '2', ''], ['0', ''],
    {
        sAction: 'delete',
        oRange: r(2, 0, 3, 0),
        aLines: ['2', '']
    },
    {
        sAction: 'delete',
        oRange: r(1, 0, 2, 0),
        aLines: ['1', '']
    }
);


///////////////////////////////////////////////////////////////////////////////
//                                 Multi Line                                //
///////////////////////////////////////////////////////////////////////////////


///////////////////// X before Y
_test(
    'Multi line - Insert before Insert',
    ['a2'], ['ab', '123', 'A'],
    {
        sAction: 'insert',
        oRange: r(0, 1, 1, 1),
        aLines: ['b', '1']
    },
    {
        sAction: 'insert',
        oRange: r(0, 2, 1, 1),
        aLines: ['3', 'A']
    }
);

_test(
    'Multi line - Insert before Delete',
    ['a2A'], ['ab', '1A'],
    {
        sAction: 'insert',
        oRange: r(0, 1, 1, 1),
        aLines: ['b', '1']
    },
    {
        sAction: 'delete',
        oRange: r(0, 1, 0, 2),
        aLines: ['2']
    }
);

_test(
    'Multi line - Delete before Delete',
    ['0a', 'b1c', 'd2', ''], ['012', ''],
    {
        sAction: 'delete',
        oRange: r(0, 1, 1, 1),
        aLines: ['a', 'b']
    },
    {
        sAction: 'delete',
        oRange: r(1, 2, 2, 1),
        aLines: ['c', 'd']
    }
);

_test(
    'Multi line - Delete before Insert',
    ['0a', 'b1', ''], ['012', ''],
    {
        sAction: 'delete',
        oRange: r(0, 1, 1, 1),
        aLines: ['a', 'b']
    },
    {
        sAction: 'insert',
        oRange: r(1, 2, 1, 3),
        aLines: ['2']
    }
);

///////////////////// X and Y ends overlap

_test(
    'Multi line - Delete end overlaps Delete start',
    ['0a', 'b1', 'd1', ''], ['01', ''],
    {
        sAction: 'delete',
        oRange: r(0, 1, 1, 2),
        aLines: ['a', 'b1']
    },
    {
        sAction: 'delete',
        oRange: r(1, 0, 2, 1),
        aLines: ['b1', 'd']
    }
);

_test(
    'Multi line - Delete end overlaps Insert start',
    ['0a', 'b', ''], ['01', '2', ''],
    {
        sAction: 'delete',
        oRange: r(0, 1, 1, 1),
        aLines: ['a', 'b']
    },
    {
        sAction: 'insert',
        oRange: r(1, 1, 2, 2),
        aLines: ['1', '2']
    }
);

///////////////////// X wraps Y 

_test(
    'Multi line - Delete wraps Insert',
    ['0a', 'b2', ''], ['012', ''],
    {
        sAction: 'delete',
        oRange: r(0, 1, 1, 1),
        aLines: ['a', 'b']
    },
    {
        sAction: 'insert',
        oRange: r(1, 0, 1, 1),
        aLines: ['1']
    }
);

_test(
    'Multi line - Delete wraps delete',
    ['0ab', 'c1', ''], ['01', ''],
    {
        sAction: 'delete',
        oRange: r(0, 1, 1, 1),
        aLines: ['ab', 'c']
    },
    {
        sAction: 'delete',
        oRange: r(0, 2, 0, 3),
        aLines: ['b']
    }
);

///////////////////// X contained by Y

_test(
    'Multi line - Delete contained by delete',
    ['0ab', 'c1', ''], ['01', ''],
    {
        sAction: 'delete',
        oRange: r(0, 2, 0, 3),
        aLines: ['b']
    },
    {
        sAction: 'delete',
        oRange: r(0, 1, 1, 1),
        aLines: ['ab', 'c']
    }
);

_test(
    'Multi line - Insert contained by Delete',
    ['0a', 'b1', ''], ['01', ''],
    {
        sAction: 'insert',
        oRange: r(0, 2, 0, 3),
        aLines: ['X']
    },
    {
        sAction: 'delete',
        oRange: r(0, 1, 1, 1),
        aLines: ['a', 'b']
    }
);


///////////////////// X after Y

_test(
    'Multi line - Insert after Delete',
    ['0', '1a', ''], ['0', '12', ''],
    {
        sAction: 'insert',
        oRange: r(1, 2, 1, 3),
        aLines: ['2']
    },
    {
        sAction: 'delete',
        oRange: r(1, 1, 1, 2),
        aLines: ['a']
    }
);

function r(iStartRow, iStartCol, iEndRow, iEndCol)
{
    return {
        oStart: {iRow: iStartRow, iCol: iStartCol},
        oEnd:   {iRow: iEndRow  , iCol: iEndCol  }
    };
}

function _test(sTestName, aStartLines, aEndLines, oPrevDelta, oDelta)
{
    test(sTestName, function()
    {
        // Transform delta.
        oDelta.oRange = oOT.transformRange(oPrevDelta, oDelta.oRange);
        
        // Apply delta.
        var oDocument = new Document({aLines: aStartLines});
        oDocument.applyDelta(oPrevDelta);
        oDocument.applyDelta(oDelta);
        
        // Test result.
        deepEqual(oDocument.get('aLines'), aEndLines);
    });
}
