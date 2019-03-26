import * as path from "path";
import { compileFilesWithOptions } from "../../src/Compiler";

test.each([
    {
        errorMsg:
            "Encountered error parsing file: Default Imports are not supported, please use named imports instead!",
        fileName: "default_import.ts",
    },
])("Compile project (%p)", ({ errorMsg, fileName }) => {
    jest.spyOn(console, "log").mockReturnValue(undefined);
    const errorMock = jest.spyOn(console, "error").mockReturnValue(undefined);
    const exitMock = jest.spyOn(process, "exit").mockReturnValue(undefined as never);

    fileName = path.resolve(__dirname, "testfiles", fileName);
    compileFilesWithOptions([fileName], { outDir: ".", rootDir: ".", types: [] });

    jest.restoreAllMocks();

    expect(exitMock).toHaveBeenCalledWith(1);
    expect(errorMock).toHaveBeenCalledTimes(2);
    expect(errorMock).toHaveBeenNthCalledWith(1, errorMsg);
    expect(errorMock).toHaveBeenNthCalledWith(2, expect.any(String));
});
