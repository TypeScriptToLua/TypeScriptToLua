import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { assert, castArray } from "../../utils";
import { TransformationContext } from "../context";
import { createExportedIdentifier, getIdentifierExportScope } from "./export";
import { peekScope, ScopeType, Scope, addScopeVariableDeclaration } from "./scope";
import { transformLuaLibFunction } from "./lualib";
import { LuaLibFeature } from "../../LuaLib";

export type OneToManyVisitorResult<T extends lua.Node> = T | T[] | undefined;
export function unwrapVisitorResult<T extends lua.Node>(result: OneToManyVisitorResult<T>): T[] {
    return result === undefined ? [] : castArray(result);
}

export function createSelfIdentifier(tsOriginal?: ts.Node): lua.Identifier {
    return lua.createIdentifier("self", tsOriginal, undefined, "this");
}

export function createExportsIdentifier(): lua.Identifier {
    return lua.createIdentifier("____exports");
}

export function addToNumericExpression(expression: lua.Expression, change: number): lua.Expression {
    if (change === 0) return expression;

    const literalValue = getNumberLiteralValue(expression);
    if (literalValue !== undefined) {
        const newNode = lua.createNumericLiteral(literalValue + change);
        lua.setNodePosition(newNode, expression);
        return newNode;
    }

    if (lua.isBinaryExpression(expression)) {
        if (
            lua.isNumericLiteral(expression.right) &&
            ((expression.operator === lua.SyntaxKind.SubtractionOperator && expression.right.value === change) ||
                (expression.operator === lua.SyntaxKind.AdditionOperator && expression.right.value === -change))
        ) {
            return expression.left;
        }
    }

    return change > 0
        ? lua.createBinaryExpression(expression, lua.createNumericLiteral(change), lua.SyntaxKind.AdditionOperator)
        : lua.createBinaryExpression(expression, lua.createNumericLiteral(-change), lua.SyntaxKind.SubtractionOperator);
}

export function getNumberLiteralValue(expression?: lua.Expression) {
    if (!expression) return undefined;

    if (lua.isNumericLiteral(expression)) return expression.value;

    if (
        lua.isUnaryExpression(expression) &&
        expression.operator === lua.SyntaxKind.NegationOperator &&
        lua.isNumericLiteral(expression.operand)
    ) {
        return -expression.operand.value;
    }

    return undefined;
}

export function createUnpackCall(
    context: TransformationContext,
    expression: lua.Expression,
    tsOriginal?: ts.Node
): lua.Expression {
    if (context.luaTarget === LuaTarget.Universal) {
        return transformLuaLibFunction(context, LuaLibFeature.Unpack, tsOriginal, expression);
    }

    const unpack =
        context.luaTarget === LuaTarget.Lua50 ||
        context.luaTarget === LuaTarget.Lua51 ||
        context.luaTarget === LuaTarget.LuaJIT
            ? lua.createIdentifier("unpack")
            : lua.createTableIndexExpression(lua.createIdentifier("table"), lua.createStringLiteral("unpack"));

    return lua.setNodeFlags(lua.createCallExpression(unpack, [expression], tsOriginal), lua.NodeFlags.TableUnpackCall);
}

export function isUnpackCall(node: lua.Node): boolean {
    return lua.isCallExpression(node) && (node.flags & lua.NodeFlags.TableUnpackCall) !== 0;
}

export function wrapInTable(...expressions: lua.Expression[]): lua.TableExpression {
    const fields = expressions.map(e => lua.createTableFieldExpression(e));
    return lua.createTableExpression(fields);
}

export function wrapInToStringForConcat(expression: lua.Expression): lua.Expression {
    if (
        lua.isStringLiteral(expression) ||
        lua.isNumericLiteral(expression) ||
        (lua.isBinaryExpression(expression) && expression.operator === lua.SyntaxKind.ConcatOperator)
    ) {
        return expression;
    }

    return lua.createCallExpression(lua.createIdentifier("tostring"), [expression]);
}

export function createHoistableVariableDeclarationStatement(
    context: TransformationContext,
    identifier: lua.Identifier,
    initializer?: lua.Expression,
    tsOriginal?: ts.Node
): lua.AssignmentStatement | lua.VariableDeclarationStatement {
    const declaration = lua.createVariableDeclarationStatement(identifier, initializer, tsOriginal);
    if (identifier.symbolId !== undefined) {
        const scope = peekScope(context);
        assert(scope.type !== ScopeType.Switch);
        addScopeVariableDeclaration(scope, declaration);
    }

    return declaration;
}

function hasMultipleReferences(scope: Scope, identifiers: lua.Identifier | lua.Identifier[]) {
    const scopeSymbols = scope.referencedSymbols;
    if (!scopeSymbols) {
        return false;
    }

    const referenceLists = castArray(identifiers).map(i => i.symbolId && scopeSymbols.get(i.symbolId));

    return referenceLists.some(symbolRefs => symbolRefs && symbolRefs.length > 1);
}

export function createLocalOrExportedOrGlobalDeclaration(
    context: TransformationContext,
    lhs: lua.Identifier | lua.Identifier[],
    rhs?: lua.Expression | lua.Expression[],
    tsOriginal?: ts.Node,
    overrideExportScope?: ts.SourceFile | ts.ModuleDeclaration
): lua.Statement[] {
    let declaration: lua.VariableDeclarationStatement | undefined;
    let assignment: lua.AssignmentStatement | undefined;

    const noImplicitGlobalVariables = context.options.noImplicitGlobalVariables === true;

    const isFunctionDeclaration = tsOriginal !== undefined && ts.isFunctionDeclaration(tsOriginal);

    const identifiers = castArray(lhs);
    if (identifiers.length === 0) {
        return [];
    }

    const exportScope = overrideExportScope ?? getIdentifierExportScope(context, identifiers[0]);
    if (exportScope) {
        // exported
        if (!rhs) {
            return [];
        } else {
            assignment = lua.createAssignmentStatement(
                identifiers.map(identifier => createExportedIdentifier(context, identifier, exportScope)),
                rhs,
                tsOriginal
            );
        }
    } else {
        const scope = peekScope(context);
        const isTopLevelVariable = scope.type === ScopeType.File;

        if (context.isModule || !isTopLevelVariable || noImplicitGlobalVariables) {
            const isLuaFunctionExpression = rhs && !Array.isArray(rhs) && lua.isFunctionExpression(rhs);
            const isSafeRecursiveFunctionDeclaration = isFunctionDeclaration && isLuaFunctionExpression;
            if (!isSafeRecursiveFunctionDeclaration && hasMultipleReferences(scope, lhs)) {
                // Split declaration and assignment of identifiers that reference themselves in their declaration.
                // Put declaration above preceding statements in case the identifier is referenced in those.
                const precedingDeclaration = lua.createVariableDeclarationStatement(lhs, undefined, tsOriginal);
                context.prependPrecedingStatements(precedingDeclaration);
                if (rhs) {
                    assignment = lua.createAssignmentStatement(lhs, rhs, tsOriginal);
                }

                // Remember local variable declarations for hoisting later
                addScopeVariableDeclaration(scope, precedingDeclaration);
            } else {
                declaration = lua.createVariableDeclarationStatement(lhs, rhs, tsOriginal);

                if (!isFunctionDeclaration) {
                    // Remember local variable declarations for hoisting later
                    addScopeVariableDeclaration(scope, declaration);
                }
            }
        } else if (rhs) {
            // global
            assignment = lua.createAssignmentStatement(lhs, rhs, tsOriginal);
        } else {
            return [];
        }
    }

    if (isFunctionDeclaration) {
        // Remember function definitions for hoisting later
        const functionSymbolId = (lhs as lua.Identifier).symbolId;
        const scope = peekScope(context);
        if (functionSymbolId && scope.functionDefinitions) {
            const definitions = scope.functionDefinitions.get(functionSymbolId);
            if (definitions) {
                definitions.definition = declaration ?? assignment;
            }
        }
    }

    setJSDocComments(context, tsOriginal, declaration, assignment);

    if (declaration && assignment) {
        return [declaration, assignment];
    } else if (declaration) {
        return [declaration];
    } else if (assignment) {
        return [assignment];
    } else {
        return [];
    }
}

/**
 * Apply JSDoc comments to the newly-created Lua statement, if present.
 * https://stackoverflow.com/questions/47429792/is-it-possible-to-get-comments-as-nodes-in-the-ast-using-the-typescript-compiler
 */
function setJSDocComments(
    context: TransformationContext,
    tsOriginal: ts.Node | undefined,
    declaration: lua.VariableDeclarationStatement | undefined,
    assignment: lua.AssignmentStatement | undefined
) {
    // Respect the vanilla TypeScript option of "removeComments":
    // https://www.typescriptlang.org/tsconfig#removeComments
    if (context.options.removeComments) {
        return;
    }

    const docCommentArray = getJSDocCommentFromTSNode(context, tsOriginal);
    if (docCommentArray === undefined) {
        return;
    }

    if (declaration && assignment) {
        declaration.leadingComments = docCommentArray;
    } else if (declaration) {
        declaration.leadingComments = docCommentArray;
    } else if (assignment) {
        assignment.leadingComments = docCommentArray;
    }
}

function getJSDocCommentFromTSNode(
    context: TransformationContext,
    tsOriginal: ts.Node | undefined
): string[] | undefined {
    if (tsOriginal === undefined) {
        return undefined;
    }

    // The "name" property is only on a subset of node types; we want to be permissive and get the
    // comments from as many nodes as possible.
    const node = tsOriginal as any;
    if (node.name === undefined) {
        return undefined;
    }

    const symbol = context.checker.getSymbolAtLocation(node.name);
    if (symbol === undefined) {
        return undefined;
    }

    // The TypeScript compiler separates JSDoc comments into the "documentation comment" and the
    // "tags". The former is conventionally at the top of the comment, and the bottom is
    // conventionally at the bottom. We need to get both from the TypeScript API and then combine
    // them into one block of text.
    const docCommentArray = symbol.getDocumentationComment(context.checker);
    const docCommentText = ts.displayPartsToString(docCommentArray).trim();

    const jsDocTagInfoArray = symbol.getJsDocTags(context.checker);
    const jsDocTagsTextLines = jsDocTagInfoArray.map(jsDocTagInfo => {
        let text = "@" + jsDocTagInfo.name;
        if (jsDocTagInfo.text !== undefined) {
            const tagDescriptionTextArray = jsDocTagInfo.text
                .filter(symbolDisplayPart => symbolDisplayPart.text.trim() !== "")
                .map(symbolDisplayPart => symbolDisplayPart.text.trim());
            const tagDescriptionText = tagDescriptionTextArray.join(" ");
            text += " " + tagDescriptionText;
        }
        return text;
    });
    const jsDocTagsText = jsDocTagsTextLines.join("\n");

    const combined = (docCommentText + "\n\n" + jsDocTagsText).trim();
    if (combined === "") {
        return undefined;
    }

    // By default, TSTL will display comments immediately next to the "--" characters. We can make
    // the comments look better if we separate them by a space (similar to what Prettier does in
    // JavaScript/TypeScript).
    const linesWithoutSpace = combined.split("\n");
    const lines = linesWithoutSpace.map(line => ` ${line}`);

    // We want to JSDoc comments to map on to LDoc comments:
    // https://stevedonovan.github.io/ldoc/manual/doc.md.html
    // LDoc comments require that the first line starts with three hyphens.
    // Thus, need to add a hyphen to the first line.
    if (lines.length > 0) {
        const firstLine = lines[0];
        if (firstLine.startsWith(" @")) {
            lines.unshift("-");
        } else {
            lines.shift();
            lines.unshift("-" + firstLine);
        }

        return lines;
    }
}

export const createNaN = (tsOriginal?: ts.Node) =>
    lua.createBinaryExpression(
        lua.createNumericLiteral(0),
        lua.createNumericLiteral(0),
        lua.SyntaxKind.DivisionOperator,
        tsOriginal
    );
