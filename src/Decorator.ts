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

export class DecoratorCollection {
    private decorators: Map<DecoratorKind, Decorator>;

    constructor(rawCommentLines: string[]) {
        this.decorators = new Map<DecoratorKind, Decorator>();
        rawCommentLines.forEach(raw => {
            const dec = new Decorator(raw);
            this.decorators.set(dec.kind, dec);
        });
    }

    public hasDecorator(kind: DecoratorKind): boolean {
        return this.decorators.has(kind);
    }

    public getDecorator(kind: DecoratorKind): Decorator {
        return this.decorators.get(kind);
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
}
