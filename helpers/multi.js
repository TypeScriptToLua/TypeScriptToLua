module.exports.symbol = Symbol("Multi Brand Symbol");

module.exports.multi = (...values) => {
    return {
        " __multiBrand": module.exports.symbol,
        ...values,
    };
};
