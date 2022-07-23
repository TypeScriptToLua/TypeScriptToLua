import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { OneToManyVisitorResult } from "../utils/lua-ast";
import { TransformationContext } from "./context";

interface NodesBySyntaxKind {
    // Copied from is* type guards, with JSDoc and TypeNodes removed
    [ts.SyntaxKind.NumericLiteral]: ts.NumericLiteral;
    [ts.SyntaxKind.BigIntLiteral]: ts.BigIntLiteral;
    [ts.SyntaxKind.StringLiteral]: ts.StringLiteral;
    [ts.SyntaxKind.JsxText]: ts.JsxText;
    [ts.SyntaxKind.RegularExpressionLiteral]: ts.RegularExpressionLiteral;
    [ts.SyntaxKind.NoSubstitutionTemplateLiteral]: ts.NoSubstitutionTemplateLiteral;
    [ts.SyntaxKind.TemplateHead]: ts.TemplateHead;
    [ts.SyntaxKind.TemplateMiddle]: ts.TemplateMiddle;
    [ts.SyntaxKind.TemplateTail]: ts.TemplateTail;
    [ts.SyntaxKind.Identifier]: ts.Identifier;
    [ts.SyntaxKind.QualifiedName]: ts.QualifiedName;
    [ts.SyntaxKind.ComputedPropertyName]: ts.ComputedPropertyName;
    [ts.SyntaxKind.TypeParameter]: ts.TypeParameterDeclaration;
    [ts.SyntaxKind.Parameter]: ts.ParameterDeclaration;
    [ts.SyntaxKind.Decorator]: ts.Decorator;
    [ts.SyntaxKind.PropertySignature]: ts.PropertySignature;
    [ts.SyntaxKind.PropertyDeclaration]: ts.PropertyDeclaration;
    [ts.SyntaxKind.MethodSignature]: ts.MethodSignature;
    [ts.SyntaxKind.MethodDeclaration]: ts.MethodDeclaration;
    [ts.SyntaxKind.Constructor]: ts.ConstructorDeclaration;
    [ts.SyntaxKind.GetAccessor]: ts.GetAccessorDeclaration;
    [ts.SyntaxKind.SetAccessor]: ts.SetAccessorDeclaration;
    [ts.SyntaxKind.CallSignature]: ts.CallSignatureDeclaration;
    [ts.SyntaxKind.ConstructSignature]: ts.ConstructSignatureDeclaration;
    [ts.SyntaxKind.IndexSignature]: ts.IndexSignatureDeclaration;
    [ts.SyntaxKind.ObjectBindingPattern]: ts.ObjectBindingPattern;
    [ts.SyntaxKind.ArrayBindingPattern]: ts.ArrayBindingPattern;
    [ts.SyntaxKind.BindingElement]: ts.BindingElement;
    [ts.SyntaxKind.ArrayLiteralExpression]: ts.ArrayLiteralExpression;
    [ts.SyntaxKind.ObjectLiteralExpression]: ts.ObjectLiteralExpression;
    [ts.SyntaxKind.PropertyAccessExpression]: ts.PropertyAccessExpression;
    [ts.SyntaxKind.ElementAccessExpression]: ts.ElementAccessExpression;
    [ts.SyntaxKind.CallExpression]: ts.CallExpression;
    [ts.SyntaxKind.NewExpression]: ts.NewExpression;
    [ts.SyntaxKind.TaggedTemplateExpression]: ts.TaggedTemplateExpression;
    [ts.SyntaxKind.TypeAssertionExpression]: ts.TypeAssertion;
    [ts.SyntaxKind.ParenthesizedExpression]: ts.ParenthesizedExpression;
    [ts.SyntaxKind.FunctionExpression]: ts.FunctionExpression;
    [ts.SyntaxKind.ArrowFunction]: ts.ArrowFunction;
    [ts.SyntaxKind.DeleteExpression]: ts.DeleteExpression;
    [ts.SyntaxKind.TypeOfExpression]: ts.TypeOfExpression;
    [ts.SyntaxKind.VoidExpression]: ts.VoidExpression;
    [ts.SyntaxKind.AwaitExpression]: ts.AwaitExpression;
    [ts.SyntaxKind.PrefixUnaryExpression]: ts.PrefixUnaryExpression;
    [ts.SyntaxKind.PostfixUnaryExpression]: ts.PostfixUnaryExpression;
    [ts.SyntaxKind.BinaryExpression]: ts.BinaryExpression;
    [ts.SyntaxKind.ConditionalExpression]: ts.ConditionalExpression;
    [ts.SyntaxKind.TemplateExpression]: ts.TemplateExpression;
    [ts.SyntaxKind.YieldExpression]: ts.YieldExpression;
    [ts.SyntaxKind.SpreadElement]: ts.SpreadElement;
    [ts.SyntaxKind.ClassExpression]: ts.ClassExpression;
    [ts.SyntaxKind.OmittedExpression]: ts.OmittedExpression;
    [ts.SyntaxKind.ExpressionWithTypeArguments]: ts.ExpressionWithTypeArguments;
    [ts.SyntaxKind.AsExpression]: ts.AsExpression;
    [ts.SyntaxKind.NonNullExpression]: ts.NonNullExpression;
    [ts.SyntaxKind.MetaProperty]: ts.MetaProperty;
    [ts.SyntaxKind.TemplateSpan]: ts.TemplateSpan;
    [ts.SyntaxKind.SemicolonClassElement]: ts.SemicolonClassElement;
    [ts.SyntaxKind.Block]: ts.Block;
    [ts.SyntaxKind.VariableStatement]: ts.VariableStatement;
    [ts.SyntaxKind.EmptyStatement]: ts.EmptyStatement;
    [ts.SyntaxKind.ExpressionStatement]: ts.ExpressionStatement;
    [ts.SyntaxKind.IfStatement]: ts.IfStatement;
    [ts.SyntaxKind.DoStatement]: ts.DoStatement;
    [ts.SyntaxKind.WhileStatement]: ts.WhileStatement;
    [ts.SyntaxKind.ForStatement]: ts.ForStatement;
    [ts.SyntaxKind.ForInStatement]: ts.ForInStatement;
    [ts.SyntaxKind.ForOfStatement]: ts.ForOfStatement;
    [ts.SyntaxKind.ContinueStatement]: ts.ContinueStatement;
    [ts.SyntaxKind.BreakStatement]: ts.BreakStatement;
    [ts.SyntaxKind.ReturnStatement]: ts.ReturnStatement;
    [ts.SyntaxKind.WithStatement]: ts.WithStatement;
    [ts.SyntaxKind.SwitchStatement]: ts.SwitchStatement;
    [ts.SyntaxKind.LabeledStatement]: ts.LabeledStatement;
    [ts.SyntaxKind.ThrowStatement]: ts.ThrowStatement;
    [ts.SyntaxKind.TryStatement]: ts.TryStatement;
    [ts.SyntaxKind.DebuggerStatement]: ts.DebuggerStatement;
    [ts.SyntaxKind.VariableDeclaration]: ts.VariableDeclaration;
    [ts.SyntaxKind.VariableDeclarationList]: ts.VariableDeclarationList;
    [ts.SyntaxKind.FunctionDeclaration]: ts.FunctionDeclaration;
    [ts.SyntaxKind.ClassDeclaration]: ts.ClassDeclaration;
    [ts.SyntaxKind.InterfaceDeclaration]: ts.InterfaceDeclaration;
    [ts.SyntaxKind.TypeAliasDeclaration]: ts.TypeAliasDeclaration;
    [ts.SyntaxKind.EnumDeclaration]: ts.EnumDeclaration;
    [ts.SyntaxKind.ModuleDeclaration]: ts.ModuleDeclaration;
    [ts.SyntaxKind.ModuleBlock]: ts.ModuleBlock;
    [ts.SyntaxKind.CaseBlock]: ts.CaseBlock;
    [ts.SyntaxKind.NamespaceExportDeclaration]: ts.NamespaceExportDeclaration;
    [ts.SyntaxKind.ImportEqualsDeclaration]: ts.ImportEqualsDeclaration;
    [ts.SyntaxKind.ImportDeclaration]: ts.ImportDeclaration;
    [ts.SyntaxKind.ImportClause]: ts.ImportClause;
    [ts.SyntaxKind.NamespaceImport]: ts.NamespaceImport;
    [ts.SyntaxKind.NamedImports]: ts.NamedImports;
    [ts.SyntaxKind.ImportSpecifier]: ts.ImportSpecifier;
    [ts.SyntaxKind.ExportAssignment]: ts.ExportAssignment;
    [ts.SyntaxKind.ExportDeclaration]: ts.ExportDeclaration;
    [ts.SyntaxKind.NamedExports]: ts.NamedExports;
    [ts.SyntaxKind.ExportSpecifier]: ts.ExportSpecifier;
    [ts.SyntaxKind.MissingDeclaration]: ts.MissingDeclaration;
    [ts.SyntaxKind.ExternalModuleReference]: ts.ExternalModuleReference;
    [ts.SyntaxKind.JsxElement]: ts.JsxElement;
    [ts.SyntaxKind.JsxSelfClosingElement]: ts.JsxSelfClosingElement;
    [ts.SyntaxKind.JsxOpeningElement]: ts.JsxOpeningElement;
    [ts.SyntaxKind.JsxClosingElement]: ts.JsxClosingElement;
    [ts.SyntaxKind.JsxFragment]: ts.JsxFragment;
    [ts.SyntaxKind.JsxOpeningFragment]: ts.JsxOpeningFragment;
    [ts.SyntaxKind.JsxClosingFragment]: ts.JsxClosingFragment;
    [ts.SyntaxKind.JsxAttribute]: ts.JsxAttribute;
    [ts.SyntaxKind.JsxAttributes]: ts.JsxAttributes;
    [ts.SyntaxKind.JsxSpreadAttribute]: ts.JsxSpreadAttribute;
    [ts.SyntaxKind.JsxExpression]: ts.JsxExpression;
    [ts.SyntaxKind.CaseClause]: ts.CaseClause;
    [ts.SyntaxKind.DefaultClause]: ts.DefaultClause;
    [ts.SyntaxKind.HeritageClause]: ts.HeritageClause;
    [ts.SyntaxKind.CatchClause]: ts.CatchClause;
    [ts.SyntaxKind.PropertyAssignment]: ts.PropertyAssignment;
    [ts.SyntaxKind.ShorthandPropertyAssignment]: ts.ShorthandPropertyAssignment;
    [ts.SyntaxKind.SpreadAssignment]: ts.SpreadAssignment;
    [ts.SyntaxKind.EnumMember]: ts.EnumMember;
    [ts.SyntaxKind.SourceFile]: ts.SourceFile;
    // [ts.SyntaxKind.Bundle]: ts.Bundle;

    // Not included above
    [ts.SyntaxKind.TrueKeyword]: ts.BooleanLiteral;
    [ts.SyntaxKind.FalseKeyword]: ts.BooleanLiteral;
    [ts.SyntaxKind.NullKeyword]: ts.NullLiteral;
    [ts.SyntaxKind.SuperKeyword]: ts.SuperExpression;
    [ts.SyntaxKind.ThisKeyword]: ts.ThisExpression;
    [ts.SyntaxKind.NotEmittedStatement]: ts.NotEmittedStatement;
}

export type ExpressionLikeNode = ts.Expression | ts.QualifiedName | ts.ExternalModuleReference;
export type StatementLikeNode = ts.Statement;
export type VisitorResult<T extends ts.Node> = T extends ExpressionLikeNode
    ? lua.Expression
    : T extends StatementLikeNode
    ? OneToManyVisitorResult<lua.Statement>
    : T extends ts.SourceFile
    ? lua.File
    : OneToManyVisitorResult<lua.Node>;

export type Visitor<T extends ts.Node> = FunctionVisitor<T> | ObjectVisitor<T>;
export type FunctionVisitor<T extends ts.Node> = (node: T, context: TransformationContext) => VisitorResult<T>;
export interface ObjectVisitor<T extends ts.Node> {
    transform: FunctionVisitor<T>;

    /**
     * Visitors with higher priority are called first.
     *
     * Higher-priority visitors can call lower ones with `context.superTransformNode`.
     *
     * Standard visitors have the lowest (`-Infinity`) priority.
     */
    priority?: number;
}

export type Visitors = { [P in keyof NodesBySyntaxKind]?: Visitor<NodesBySyntaxKind[P]> };
export type VisitorMap = Map<ts.SyntaxKind, Array<FunctionVisitor<ts.Node>>>;
