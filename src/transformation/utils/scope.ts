import * as assert from "assert";
import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { getOrUpdate, isNonNull } from "../../utils";
import { TransformationContext } from "../context";
import { UndefinedFunctionDefinition, UndefinedScope } from "./errors";
import { getSymbolInfo } from "./symbols";
import { getFirstDeclarationInFile } from "./typescript";

export enum ScopeType {
    File = 1 << 0,
    Function = 1 << 1,
    Switch = 1 << 2,
    Loop = 1 << 3,
    Conditional = 1 << 4,
    Block = 1 << 5,
    Try = 1 << 6,
    Catch = 1 << 7,
}

interface FunctionDefinitionInfo {
    referencedSymbols: Map<lua.SymbolId, ts.Node[]>;
    definition?: lua.VariableDeclarationStatement | lua.AssignmentStatement;
}

export interface Scope {
    type: ScopeType;
    id: number;
    referencedSymbols?: Map<lua.SymbolId, ts.Node[]>;
    variableDeclarations?: lua.VariableDeclarationStatement[];
    functionDefinitions?: Map<lua.SymbolId, FunctionDefinitionInfo>;
    importStatements?: lua.Statement[];
    loopContinued?: boolean;
    functionReturned?: boolean;
}

const scopeStacks = new WeakMap<TransformationContext, Scope[]>();
function getScopeStack(context: TransformationContext): Scope[] {
    return getOrUpdate(scopeStacks, context, () => []);
}

export function* walkScopesUp(context: TransformationContext): IterableIterator<Scope> {
    const scopeStack = getScopeStack(context);
    for (let i = scopeStack.length - 1; i >= 0; --i) {
        const scope = scopeStack[i];
        yield scope;
    }
}

export function markSymbolAsReferencedInCurrentScopes(
    context: TransformationContext,
    symbolId: lua.SymbolId,
    identifier: ts.Identifier
): void {
    for (const scope of getScopeStack(context)) {
        if (!scope.referencedSymbols) {
            scope.referencedSymbols = new Map();
        }

        const references = getOrUpdate(scope.referencedSymbols, symbolId, () => []);
        references.push(identifier);
    }
}

export function peekScope(context: TransformationContext): Scope {
    const scopeStack = getScopeStack(context);
    const scope = scopeStack[scopeStack.length - 1];
    if (!scope) {
        throw UndefinedScope();
    }

    return scope;
}

export function findScope(context: TransformationContext, scopeTypes: ScopeType): Scope | undefined {
    return [...getScopeStack(context)].reverse().find(s => scopeTypes & s.type);
}

const scopeIdCounters = new WeakMap<TransformationContext, number>();
export function pushScope(context: TransformationContext, scopeType: ScopeType): Scope {
    const nextScopeId = (scopeIdCounters.get(context) ?? 0) + 1;
    scopeIdCounters.set(context, nextScopeId);

    const scopeStack = getScopeStack(context);
    const scope: Scope = { type: scopeType, id: nextScopeId };
    scopeStack.push(scope);
    return scope;
}

export function popScope(context: TransformationContext): Scope {
    const scopeStack = getScopeStack(context);
    const scope = scopeStack.pop();
    if (!scope) {
        throw UndefinedScope();
    }

    return scope;
}

export function performHoisting(context: TransformationContext, statements: lua.Statement[]): lua.Statement[] {
    if (context.options.noHoisting) {
        return statements;
    }

    const scope = peekScope(context);
    let result = statements;
    result = hoistFunctionDefinitions(context, scope, result);
    result = hoistVariableDeclarations(context, scope, result);
    result = hoistImportStatements(scope, result);
    return result;
}

function shouldHoistSymbol(context: TransformationContext, symbolId: lua.SymbolId, scope: Scope): boolean {
    const symbolInfo = getSymbolInfo(context, symbolId);
    if (!symbolInfo) {
        return false;
    }

    const declaration = getFirstDeclarationInFile(symbolInfo.symbol, context.sourceFile);
    if (!declaration) {
        return false;
    }

    if (symbolInfo.firstSeenAtPos < declaration.pos) {
        return true;
    }

    if (scope.functionDefinitions) {
        for (const [functionSymbolId, functionDefinition] of scope.functionDefinitions) {
            if (functionDefinition.definition === undefined) {
                throw UndefinedFunctionDefinition(functionSymbolId);
            }

            const { line, column } = lua.getOriginalPos(functionDefinition.definition);
            if (line !== undefined && column !== undefined) {
                const definitionPos = ts.getPositionOfLineAndCharacter(context.sourceFile, line, column);
                if (
                    functionSymbolId !== symbolId && // Don't recurse into self
                    declaration.pos < definitionPos && // Ignore functions before symbol declaration
                    functionDefinition.referencedSymbols.has(symbolId) &&
                    shouldHoistSymbol(context, functionSymbolId, scope)
                ) {
                    return true;
                }
            }
        }
    }

    return false;
}

function hoistVariableDeclarations(
    context: TransformationContext,
    scope: Scope,
    statements: lua.Statement[]
): lua.Statement[] {
    if (!scope.variableDeclarations) {
        return statements;
    }

    const result = [...statements];
    const hoistedLocals: lua.Identifier[] = [];
    for (const declaration of scope.variableDeclarations) {
        const symbols = declaration.left.map(i => i.symbolId).filter(isNonNull);
        if (symbols.some(s => shouldHoistSymbol(context, s, scope))) {
            const index = result.indexOf(declaration);
            assert(index > -1);

            if (declaration.right) {
                const assignment = lua.createAssignmentStatement(declaration.left, declaration.right);
                lua.setNodePosition(assignment, declaration); // Preserve position info for sourcemap
                result.splice(index, 1, assignment);
            } else {
                result.splice(index, 1);
            }

            hoistedLocals.push(...declaration.left);
        } else if (scope.type === ScopeType.Switch) {
            assert(!declaration.right);
            hoistedLocals.push(...declaration.left);
        }
    }

    if (hoistedLocals.length > 0) {
        result.unshift(lua.createVariableDeclarationStatement(hoistedLocals));
    }

    return result;
}

function hoistFunctionDefinitions(
    context: TransformationContext,
    scope: Scope,
    statements: lua.Statement[]
): lua.Statement[] {
    if (!scope.functionDefinitions) {
        return statements;
    }

    const result = [...statements];
    const hoistedFunctions: Array<lua.VariableDeclarationStatement | lua.AssignmentStatement> = [];
    for (const [functionSymbolId, functionDefinition] of scope.functionDefinitions) {
        if (functionDefinition.definition === undefined) {
            throw UndefinedFunctionDefinition(functionSymbolId);
        }

        if (shouldHoistSymbol(context, functionSymbolId, scope)) {
            const index = result.indexOf(functionDefinition.definition);
            result.splice(index, 1);
            hoistedFunctions.push(functionDefinition.definition);
        }
    }

    return [...hoistedFunctions, ...result];
}

function hoistImportStatements(scope: Scope, statements: lua.Statement[]): lua.Statement[] {
    return scope.importStatements ? [...scope.importStatements, ...statements] : statements;
}
