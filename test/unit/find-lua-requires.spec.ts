import { findLuaRequires, LuaRequire } from "../../src/transpilation/find-lua-requires";

test("empty string", () => {
    expect(findLuaRequires("")).toEqual([]);
});

test("can find requires", () => {
    const lua = `
        require("req1")
        require('req2')
        local r3 = require("req3")
    `;
    expect(requirePaths(findLuaRequires(lua))).toEqual(["req1", "req2", "req3"]);
});

test("ignores requires that should not be included", () => {
    const lua = `
        require("req1")
        local a = "require('This should not be included')"
        require('req2')
        local b = 'require("This should not be included")'
        require("req3")
        -- require("this should not be included")
        require("req4")
        --[[ require("this should not be included") ]]
        require("req5")
    `;
    expect(requirePaths(findLuaRequires(lua))).toEqual(["req1", "req2", "req3", "req4", "req5"]);
});

test("non-terminated require", () => {
    expect(findLuaRequires("require('abc")).toEqual([]);
});

describe.each(['"', "'"])("strings with delimiter %p", delimiter => {
    test("escaped delimiter", () => {
        const lua = `
            require(${delimiter}req1${delimiter});
            local a = ${delimiter}require(excludeThis\\${delimiter})${delimiter}
            require(${delimiter}req\\${delimiter}2${delimiter});
        `;
        expect(requirePaths(findLuaRequires(lua))).toEqual(["req1", `req${delimiter}2`]);
    });

    test("multiple escaped delimiters", () => {
        const lua = `
            require(${delimiter}r\\${delimiter}e.- q%\\${delimiter}1${delimiter})
        `;
        expect(requirePaths(findLuaRequires(lua))).toEqual([`r${delimiter}e.- q%${delimiter}1`]);
    });

    test("handles other escaped characters", () => {
        expect(requirePaths(findLuaRequires(`require(${delimiter}req\\n\\\\${delimiter})`))).toEqual(["req\\n\\\\"]);
    });

    test("handles non-delimiter quote", () => {
        const oppositeDelimiter = delimiter === "'" ? '"' : "'";
        const lua = `
            require(${delimiter}req1${delimiter});
            local a = ${delimiter}require(excludeThis${oppositeDelimiter})${delimiter};
            require(${delimiter}req2${oppositeDelimiter}${delimiter});
        `;
        expect(requirePaths(findLuaRequires(lua))).toEqual(["req1", `req2${oppositeDelimiter}`]);
    });

    test("non-terminated string", () => {
        const lua = `
            require(${delimiter}myRequire${delimiter});
            local a = ${delimiter}require("excludeThis")
        `;
        expect(requirePaths(findLuaRequires(lua))).toEqual(["myRequire"]);
    });
});

describe("single-line comments", () => {
    test("comment at end of file", () => {
        expect(findLuaRequires("--")).toEqual([]);
    });

    test("require before and after comment", () => {
        const lua = `
            require("req1")-- comment\nrequire("req2")
        `;
        expect(requirePaths(findLuaRequires(lua))).toEqual(["req1", "req2"]);
    });

    test("require before and after empty comment", () => {
        const lua = `
            require("req1")--\nrequire("req2")
        `;
        expect(requirePaths(findLuaRequires(lua))).toEqual(["req1", "req2"]);
    });
});

describe("single-line comments", () => {
    test("comment at end of file", () => {
        expect(findLuaRequires("--[[]]")).toEqual([]);
    });

    test("unterminated comment", () => {
        expect(findLuaRequires("--[[")).toEqual([]);
    });

    test("require before and after comment", () => {
        const lua = `
            require("req1")--[[
               ml comment require("this should be excluded") 
            ]]require("req2")
        `;
        expect(requirePaths(findLuaRequires(lua))).toEqual(["req1", "req2"]);
    });

    test("require before and after empty comment", () => {
        const lua = `
            require("req1")--[[]]require("req2")
        `;
        expect(requirePaths(findLuaRequires(lua))).toEqual(["req1", "req2"]);
    });
});

function requirePaths(matches: LuaRequire[]): string[] {
    return matches.map(m => m.requirePath);
}
