/** @noSelf */
declare namespace math {
    /** @tupleReturn */
    function modf(x: number): [number, number];

    function atan(x: number): number;
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    function atan(y: number, x?: number): number;

    function atan2(y: number, x: number): number;

    function ceil(x: number): number;
    function floor(x: number): number;
}
