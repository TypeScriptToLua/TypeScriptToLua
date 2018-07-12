import { MatchError, TestRunner, TestSet, TestOutcome } from "alsatian";
import * as JSON from "circular-json";

module.exports = function(input, done) {
    const testSet = TestSet.create();
    testSet.addTestsFromFiles(input.files);
    const testRunner = new TestRunner();

    testRunner.onTestComplete((result) => {
        if (result.outcome === TestOutcome.Fail) {
            if (result.error instanceof MatchError) {
                console.log(`Test ${result.testFixture.description}, ${result.test.key}(${JSON.stringify(result.testCase.caseArguments)}) Failed!`)
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
        }
    })

    testRunner.run(testSet)
              .then((results) => done(results, input))
};
