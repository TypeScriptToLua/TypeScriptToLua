class MyClass {
    private _field: number;
    public get field(): number {
        return this._field + 4;
    }
    public set field(v: number) {
        this._field = v*2;
    }
}

let instance = new MyClass();
instance.field = 4;
const b = instance.field;
const c = (4 + instance.field)*3;
