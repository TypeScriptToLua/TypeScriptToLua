/** @noSelf */
declare namespace TestNamespace {
    /**
     * @customName pass
     * The first word should not be included.
     **/
    function fail(): void;
}

TestNamespace.fail();
