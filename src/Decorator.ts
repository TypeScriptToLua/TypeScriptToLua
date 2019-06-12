export class Decorator {
    public static isValid(decoratorKindString: string): boolean {
        return this.getDecoratorKind(decoratorKindString) !== undefined;
    }

    public static getDecoratorKind(decoratorKindString: string): DecoratorKind | undefined {
        switch (decoratorKindString.toLowerCase()) {
            case "extension":
                return DecoratorKind.Extension;
            case "metaextension":
                return DecoratorKind.MetaExtension;
            case "customconstructor":
                return DecoratorKind.CustomConstructor;
            case "compilemembersonly":
                return DecoratorKind.CompileMembersOnly;
            case "noresolution":
                return DecoratorKind.NoResolution;
            case "pureabstract":
                return DecoratorKind.PureAbstract;
            case "phantom":
                return DecoratorKind.Phantom;
            case "tuplereturn":
                return DecoratorKind.TupleReturn;
            case "luaiterator":
                return DecoratorKind.LuaIterator;
            case "luatable":
                return DecoratorKind.LuaTable;
            case "noself":
                return DecoratorKind.NoSelf;
            case "noselfinfile":
                return DecoratorKind.NoSelfInFile;
            case "vararg":
                return DecoratorKind.Vararg;
        }

        return undefined;
    }

    public kind: DecoratorKind;
    public args: string[];

    constructor(name: string, args: string[]) {
        const kind = Decorator.getDecoratorKind(name);
        if (kind === undefined) {
            throw new Error(`Failed to parse decorator '${name}'`);
        }

        this.kind = kind;
        this.args = args;
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
}
