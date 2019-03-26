for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) {
        continue;
    }

    for (let j = 0; j < 2; j++) {
        if (j === 1) {
            continue;
        }
    }

    if (i === 4) {
        continue;
    }
}
