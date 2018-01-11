"use strict";
exports.__esModule = true;
var ts = require("typescript");
var TSHelper = /** @class */ (function () {
    function TSHelper() {
    }
    // Get all children of a node, required until microsoft fixes node.getChildren()
    TSHelper.getChildren = function (node) {
        var children = [];
        node.forEachChild(function (child) {
            children.push(child);
        });
        return children;
    };
    // Get children filtered by function and cast to predefined type
    TSHelper.getChildrenOfType = function (node, typeFilter) {
        return this.getChildren(node).filter(typeFilter);
    };
    TSHelper.getFirstChildOfType = function (node, typeFilter) {
        return this.getChildrenOfType(node, typeFilter)[0];
    };
    // Reverse lookup of enum key by value
    TSHelper.enumName = function (needle, haystack) {
        for (var name in haystack) {
            if (haystack[name] == needle) {
                return name;
            }
        }
        return "unknown";
    };
    TSHelper.isValueType = function (node) {
        return ts.isIdentifier(node) || ts.isLiteralExpression(node) || ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node);
    };
    TSHelper.isArrayType = function (type) {
        return type.flags == ts.TypeFlags.Object && type.symbol.escapedName == "Array";
    };
    TSHelper.isCompileMembersOnlyEnum = function (type) {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Enum) != 0)
            && type.symbol.getDocumentationComment()[0] != undefined
            && (type.symbol.getDocumentationComment()[0].text.trim() == "CompileMembersOnly");
    };
    return TSHelper;
}());
exports.TSHelper = TSHelper;
