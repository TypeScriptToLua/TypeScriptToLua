const array = [1, 2, "3", 4, 3, "6", { foo: 3 }, 8, 9, 10];

export default function arrayJoin() {
    const n = 3000;
    for (let i = 0; i < n; i++) {
        array.join("|");
    }
}
