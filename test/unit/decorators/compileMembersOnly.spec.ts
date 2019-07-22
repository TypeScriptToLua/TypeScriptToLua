import * as util from "../../util";

test("compileMembersOnly in namespace", () => {
    const header = `
        namespace wifi {
            /** @compileMembersOnly */
            export enum WifiMode {
                NULLMODE = 0,
                STATION = 1,
                SOFTAP = 2
            }
        }`;
    const code = `
        return wifi.WifiMode.STATION;
    `;

    expect(util.transpileAndExecute(code, undefined, undefined, header)).toBe(1);
});
