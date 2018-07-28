let quoteInDoubleQuotes = "' ' '";
let quoteInTemplateString = `' ' '`;

let doubleQuoteInQuotes = '" " "';
let doubleQuoteInDoubleQuotes = "\" \" \"";
let doubleQuoteInTemplateString = `" " "`;

let escapedCharsInQuotes = '\\ \0 \b \t \n \v \f \" \' \`';
let escapedCharsInDoubleQUotes = "\\ \0 \b \t \n \v \f \" \' \`";
let escapedCharsInTemplateString = `\\ \0 \b \t \n \v \f \" \' \``;

let nonEmptyTemplateString = `Level 0: \n\t ${`Level 1: \n\t\t ${`Level 3: \n\t\t\t ${'Last level \n --'} \n --`} \n --`} \n --`;
