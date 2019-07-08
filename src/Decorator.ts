export class Decorator {
    public static isValid(decoratorKindString: string): boolean {
        return this.getDecoratorKind(decoratorKindString) !== undefined;
    }

    public static getDecoratorKind(decoratorKindString: string): DecoratorKind | undefined {
        return Object.values(DecoratorKind).find(
            decoratorKind => decoratorKind.toLowerCase() === decoratorKindString.toLowerCase()
        );
    }

    public kind: DecoratorKind;
    constructor(name: string, public args: string[]) {
        const kind = Decorator.getDecoratorKind(name);
        if (kind === undefined) {
            throw new Error(`Failed to parse decorator '${name}'`);
        }

        this.kind = kind;
    }
}

export enum DecoratorKind {
    Extension = "Extension",
    MetaExtension = "MetaExtension",
    CustomConstructor = "CustomConstructor",
    CompileMembersOnly = "CompileMembersOnly",
    NoResolution = "NoResolution",
    PureAbstract = "PureAbstract",
    Phantom = "Phantom",
    TupleReturn = "TupleReturn",
    LuaIterator = "LuaIterator",
    LuaTable = "LuaTable",
    NoSelf = "NoSelf",
    NoSelfInFile = "NoSelfInFile",
    Vararg = "Vararg",
    ForRange = "ForRange",
}
