export default function stringReplace() {
    const str = "one";
    const n = 50000;
    for (let i = 0; i < n; i++) {
        str.concat("two", "three", "four", "five");
    }
    return str;
}
