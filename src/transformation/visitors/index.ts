import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, Visitors } from "../context";
import { transformElementAccessExpression, transformPropertyAccessExpression, transformQualifiedName } from "./access";
import { transformBinaryExpression } from "./binary-expression";
import { transformBlock } from "./block";
import { transformBreakStatement, transformContinueStatement } from "./break-continue";
import { transformCallExpression, transformSpreadElement } from "./call";
import {
    transformClassAsExpression,
    transformClassDeclaration,
    transformSuperExpression,
    transformThisExpression,
} from "./class";
import { transformNewExpression } from "./class/new";
import { transformConditionalExpression, transformIfStatement } from "./conditional";
import { transformDeleteExpression } from "./delete";
import { transformEnumDeclaration } from "./enum";
import { transformThrowStatement, transformTryStatement } from "./errors";
import { transformExpressionStatement } from "./expression-statement";
import { transformFunctionDeclaration, transformFunctionLikeDeclaration } from "./function";
import { transformYieldExpression } from "./generator";
import { transformIdentifierExpression } from "./identifier";
import { literalVisitors } from "./literal";
import { transformDoStatement, transformWhileStatement } from "./loops/do-while";
import { transformForStatement } from "./loops/for";
import { transformForInStatement } from "./loops/for-in";
import { transformForOfStatement } from "./loops/for-of";
import { transformExportAssignment, transformExportDeclaration } from "./modules/export";
import {
    transformExternalModuleReference,
    transformImportDeclaration,
    transformImportEqualsDeclaration,
} from "./modules/import";
import { transformModuleDeclaration } from "./namespace";
import { transformReturnStatement } from "./return";
import { transformSourceFileNode } from "./sourceFile";
import { transformSwitchStatement } from "./switch";
import { transformTaggedTemplateExpression, transformTemplateExpression } from "./template";
import { transformTypeOfExpression } from "./typeof";
import { typescriptVisitors } from "./typescript";
import { transformPostfixUnaryExpression, transformPrefixUnaryExpression } from "./unary-expression";
import { transformVariableStatement } from "./variable-declaration";

const transformEmptyStatement: FunctionVisitor<ts.EmptyStatement> = () => undefined;
const transformParenthesizedExpression: FunctionVisitor<ts.ParenthesizedExpression> = (node, context) =>
    lua.createParenthesizedExpression(context.transformExpression(node.expression), node);

export const standardVisitors: Visitors = {
    ...literalVisitors,
    ...typescriptVisitors,
    [ts.SyntaxKind.ArrowFunction]: transformFunctionLikeDeclaration,
    [ts.SyntaxKind.BinaryExpression]: transformBinaryExpression,
    [ts.SyntaxKind.Block]: transformBlock,
    [ts.SyntaxKind.BreakStatement]: transformBreakStatement,
    [ts.SyntaxKind.CallExpression]: transformCallExpression,
    [ts.SyntaxKind.ClassDeclaration]: transformClassDeclaration,
    [ts.SyntaxKind.ClassExpression]: transformClassAsExpression,
    [ts.SyntaxKind.ConditionalExpression]: transformConditionalExpression,
    [ts.SyntaxKind.ContinueStatement]: transformContinueStatement,
    [ts.SyntaxKind.DeleteExpression]: transformDeleteExpression,
    [ts.SyntaxKind.DoStatement]: transformDoStatement,
    [ts.SyntaxKind.ElementAccessExpression]: transformElementAccessExpression,
    [ts.SyntaxKind.EmptyStatement]: transformEmptyStatement,
    [ts.SyntaxKind.EnumDeclaration]: transformEnumDeclaration,
    [ts.SyntaxKind.ExportAssignment]: transformExportAssignment,
    [ts.SyntaxKind.ExportDeclaration]: transformExportDeclaration,
    [ts.SyntaxKind.ExpressionStatement]: transformExpressionStatement,
    [ts.SyntaxKind.ExternalModuleReference]: transformExternalModuleReference,
    [ts.SyntaxKind.ForInStatement]: transformForInStatement,
    [ts.SyntaxKind.ForOfStatement]: transformForOfStatement,
    [ts.SyntaxKind.ForStatement]: transformForStatement,
    [ts.SyntaxKind.FunctionDeclaration]: transformFunctionDeclaration,
    [ts.SyntaxKind.FunctionExpression]: transformFunctionLikeDeclaration,
    [ts.SyntaxKind.Identifier]: transformIdentifierExpression,
    [ts.SyntaxKind.IfStatement]: transformIfStatement,
    [ts.SyntaxKind.ImportDeclaration]: transformImportDeclaration,
    [ts.SyntaxKind.ImportEqualsDeclaration]: transformImportEqualsDeclaration,
    [ts.SyntaxKind.ModuleDeclaration]: transformModuleDeclaration,
    [ts.SyntaxKind.NewExpression]: transformNewExpression,
    [ts.SyntaxKind.ParenthesizedExpression]: transformParenthesizedExpression,
    [ts.SyntaxKind.PostfixUnaryExpression]: transformPostfixUnaryExpression,
    [ts.SyntaxKind.PrefixUnaryExpression]: transformPrefixUnaryExpression,
    [ts.SyntaxKind.PropertyAccessExpression]: transformPropertyAccessExpression,
    [ts.SyntaxKind.QualifiedName]: transformQualifiedName,
    [ts.SyntaxKind.ReturnStatement]: transformReturnStatement,
    [ts.SyntaxKind.SourceFile]: transformSourceFileNode,
    [ts.SyntaxKind.SpreadElement]: transformSpreadElement,
    [ts.SyntaxKind.SuperKeyword]: transformSuperExpression,
    [ts.SyntaxKind.SwitchStatement]: transformSwitchStatement,
    [ts.SyntaxKind.TaggedTemplateExpression]: transformTaggedTemplateExpression,
    [ts.SyntaxKind.TemplateExpression]: transformTemplateExpression,
    [ts.SyntaxKind.ThisKeyword]: transformThisExpression,
    [ts.SyntaxKind.ThrowStatement]: transformThrowStatement,
    [ts.SyntaxKind.TryStatement]: transformTryStatement,
    [ts.SyntaxKind.TypeOfExpression]: transformTypeOfExpression,
    [ts.SyntaxKind.VariableStatement]: transformVariableStatement,
    [ts.SyntaxKind.WhileStatement]: transformWhileStatement,
    [ts.SyntaxKind.YieldExpression]: transformYieldExpression,
};
