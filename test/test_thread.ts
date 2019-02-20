import { MatchError, TestRunner, TestSet, TestOutcome } from "alsatian";
import * as flatted from "flatted";

module.exports = (input, done) => {
    const testSet = TestSet.create();
    testSet.addTestsFromFiles(input.files);
    const testRunner = new TestRunner();

    let testCount = 0;
    let failedTestCount = 0;

    testRunner.onTestComplete(result => {
        if (result.outcome === TestOutcome.Fail) {
            if (result.error instanceof MatchError) {
                console.log(`Test ${result.testFixture.description}, ${result.test.key}(${flatted.stringify(result.testCase.caseArguments)}) Failed!`);
                console.log(" ---\n" +
                '   message: "' +
                result.error.message +
                '"\n' +
                "   severity: fail\n" +
                "   data:\n" +
                "     got: " +
                result.error.actual +
                "\n" +
                "     expect: " +
                result.error.expected +
                "\n");
            }
            failedTestCount++;
        }
        testCount++;
    });

    testRunner.run(testSet)
              .then(() => done(testCount, failedTestCount));
};
