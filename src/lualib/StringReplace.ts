declare namespace string {
    /** @tupleReturn */
    function gsub(source: string, searchValue: string, replaceValue: string): [string, number];
}

function __TS__StringReplace(source: string, searchValue: string, replaceValue: string): string {
    return string.gsub(source, searchValue, replaceValue)[0];
}
