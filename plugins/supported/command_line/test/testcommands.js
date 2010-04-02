/*
 *
 */

({
    "description": "blah blah",
    "provides":
    [
        {
            "ep": "command",
            "name": "tst",
            "description": "Test Command"
        },
        {
            "ep": "command",
            "name": "tst list",
            "params":
            [
                {
                    "name": "first",
                    "type": "text",
                    "description": "First param"
                }
            ],
            "description": "Tst List",
            "pointer": "test/testcommands#tstList"
        },
        {
            "ep": "command",
            "name": "tst add",
            "params":
            [
                {
                    "name": "first",
                    "type": "text",
                    "description": "First param"
                },
                {
                    "name": "second",
                    "type": { "name": "selection", "data": [ "aa", "bb" ] },
                    "description": "Second param"
                },
                {
                    "name": "third",
                    "type": "number",
                    "description": "Third param",
                    "defaultValue": 42
                },
                {
                    "name": "fourth",
                    "type": "boolean",
                    "description": "Fourth param",
                    "defaultValue": true
                }
            ],
            "description": "Tst Add",
            "pointer": "test/testcommands#tstAdd"
        },
        {
            "ep": "command",
            "name": "tst remove",
            "params": [],
            "description": "Tst Remove",
            "pointer": "test/testcommands#tstRemove"
        }
    ]
});
