declare namespace string {
    function gsub(source: string, searchValue: string, replaceValue: string);
}

function __TS__replace(source: string, searchValue: string, replaceValue: string) {
    return string.gsub(source, searchValue, replaceValue);
}
