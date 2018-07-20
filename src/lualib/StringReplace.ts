declare namespace string {
    function gsub(source: string, searchValue: string, replaceValue: string): string;
}

function __TS__StringReplace(source: string, searchValue: string, replaceValue: string): string {
    return string.gsub(source, searchValue, replaceValue);
}
