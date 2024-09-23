const xyz = 4;
export { xyz };
export { xyz as uwv };
export * from "xyz";
export { abc, def } from "xyz";
export { abc as def } from "xyz";
export { "123" as bar } from "bla";
export { foo as "123" } from "bla";
