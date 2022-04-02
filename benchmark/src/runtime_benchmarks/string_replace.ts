export default function stringReplace() {
    const str = "Hello, World!";
    const n = 50000;
    for (let i = 0; i < n; i++) {
        str.replace("World", "Universe");
    }
    return str;
}
