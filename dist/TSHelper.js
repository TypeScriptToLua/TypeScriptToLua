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
    TSHelper.isStringType = function (type) {
        return (type.flags & ts.TypeFlags.String) != 0
            || (type.flags & ts.TypeFlags.StringLike) != 0
            || (type.flags & ts.TypeFlags.StringLiteral) != 0;
    };
    TSHelper.isValueType = function (node) {
        return ts.isIdentifier(node) || ts.isLiteralExpression(node) || ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node);
    };
    TSHelper.isArrayType = function (type) {
        return (type.flags & ts.TypeFlags.Object) != 0
            && type.symbol
            && type.symbol.escapedName == "Array";
    };
    TSHelper.isTupleType = function (type) {
        return (type.flags & ts.TypeFlags.Object) != 0
            && type.typeArguments != undefined;
    };
    TSHelper.isCompileMembersOnlyEnum = function (type) {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Enum) != 0)
            && type.symbol.getDocumentationComment()[0] != undefined
            && this.hasCustomDecorator(type, "!CompileMembersOnly");
    };
    TSHelper.isPureAbstractClass = function (type) {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Class) != 0)
            && this.hasCustomDecorator(type, "!PureAbstract");
    };
    TSHelper.isExtensionClass = function (type) {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Class) != 0)
            && this.hasCustomDecorator(type, "!Extension");
    };
    TSHelper.isPhantom = function (type) {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Namespace) != 0)
            && this.hasCustomDecorator(type, "!Phantom");
    };
    TSHelper.hasCustomDecorator = function (type, decorator) {
        if (type.symbol) {
            var comment = type.symbol.getDocumentationComment();
            var decorators = comment.filter(function (_) { return _.kind == "text"; }).map(function (_) { return _.text.trim(); }).filter(function (_) { return _[0] == "!"; });
            return decorators.indexOf(decorator) > -1;
        }
        return false;
    };
    return TSHelper;
}());
exports.TSHelper = TSHelper;
