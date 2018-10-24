export class Decorator {
    public kind: DecoratorKind;
    public args: string[];

    constructor(raw: string) {
        let nameEnd = raw.indexOf(" ");
        if (nameEnd === -1) {
            nameEnd = raw.length;
        }
        this.kind = DecoratorKind[raw.substring(1, nameEnd)];
        this.args = raw.split(" ").slice(1);
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
    NoContext = "NoContext",
}
