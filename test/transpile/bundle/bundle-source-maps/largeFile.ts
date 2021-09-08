// Some comments here to check source map correctness
// Some comments here to check source map correctness

abstract class Calculator {
    protected left: number;
    protected right: number;

    constructor(left: number, right: number) {
        this.left = left;
        this.right = right;
    }

    public abstract calc(): number;
}

/**
 * Sums two numbers
 */
class CalculatorSum extends Calculator {
    public calc(): number {
        return this.left + this.right;
    }
}

class CalculatorMul extends Calculator {
    public calc(): number {
        return this.left * this.right;
    }
}

// Some comments here to check source map correctness

export const enum Operation {
    SUM = "SUM",
    MUL = "MUL",
}

// Local internal function
function resolveCalculatorClass(left: number, right: number, operation: Operation): Calculator {
    if (operation === Operation.MUL) {
        return new CalculatorMul(left, right);
    }
    if (operation === Operation.SUM) {
        return new CalculatorSum(left, right);
    }

    throw new Error(`Unknown operation ${operation}`);
}

// Some comments here to check source map correctness
export function getNumber(left: number, right: number, operation: Operation): number {
    return resolveCalculatorClass(left, right, operation).calc();
}
