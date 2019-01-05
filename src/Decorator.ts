export class Decorator {
    public static isValid(decoratorKindString: string): boolean {
        return this.getDecoratorKind(decoratorKindString) !== undefined;
    }

    public static getDecoratorKind(decoratorKindString: string): DecoratorKind {
        switch (decoratorKindString.toLowerCase()) {
            case "extension":
                return DecoratorKind.Extension;
            case "metaextension":
                return DecoratorKind.MetaExtension;
            case "customconstructor":
                return DecoratorKind.CustomConstructor;
            case "compilemembersonly":
                return DecoratorKind.CompileMembersOnly;
            case "pureabstract":
                return DecoratorKind.PureAbstract;
            case "phantom":
                return DecoratorKind.Phantom;
            case "tuplereturn":
                return DecoratorKind.TupleReturn;
            case "noclassor":
                return DecoratorKind.NoClassOr;
            case "luaiterator":
                return DecoratorKind.LuaIterator;
        }

        return undefined;
    }

    public kind: DecoratorKind;
    public args: string[];

    constructor(name: string, args: string[]) {
        this.kind = Decorator.getDecoratorKind(name);
        this.args = args;
    }
}

export enum DecoratorKind {
    Extension = "Extension",
    MetaExtension = "MetaExtension",
    CustomConstructor = "CustomConstructor",
    CompileMembersOnly = "CompileMembersOnly",
    PureAbstract = "PureAbstract",
    Phantom = "Phantom",
    TupleReturn = "TupleReturn",
    NoClassOr = "NoClassOr",
    LuaIterator = "LuaIterator",
}
