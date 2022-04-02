export default function stringReplaceAll() {
    const str = "hello, hello world!";
    const n = 50000;
    for (let i = 0; i < n; i++) {
        str.replaceAll("Hello", "Goodbye");
    }
    return str;
}
