import { TransformerPlugin } from "../context";
import { accessPlugin } from "./access";
import { binaryExpressionPlugin } from "./binary-expression";
import { blockPlugin } from "./block";
import { breakContinuePlugin } from "./break-continue";
import { callPlugin } from "./call";
import { classPlugin } from "./class";
import { conditionalPlugin } from "./conditional";
import { deletePlugin } from "./delete";
import { enumPlugin } from "./enum";
import { errorsPlugin } from "./errors";
import { expressionStatementPlugin } from "./expression-statement";
import { functionPlugin } from "./function";
import { generatorPlugin } from "./generator";
import { identifierPlugin } from "./identifier";
import { literalPlugin } from "./literal";
import { doWhilePlugin } from "./loops/do-while";
import { forPlugin } from "./loops/for";
import { forInPlugin } from "./loops/for-in";
import { forOfPlugin } from "./loops/for-of";
import { luaTablePlugin } from "./lua-table";
import { exportPlugin } from "./modules/export";
import { importPlugin } from "./modules/import";
import { namespacePlugin } from "./namespace";
import { returnPlugin } from "./return";
import { sourceFilePlugin } from "./sourceFile";
import { switchPlugin } from "./switch";
import { templatePlugin } from "./template";
import { todoMoveSomewherePlugin } from "./todo-move-somewhere";
import { typeofPlugin } from "./typeof";
import { unaryExpressionPlugin } from "./unary-expression";
import { variablePlugin } from "./variable";

export const standardPlugins: TransformerPlugin[] = [
    accessPlugin,
    binaryExpressionPlugin,
    blockPlugin,
    breakContinuePlugin,
    callPlugin,
    classPlugin,
    conditionalPlugin,
    deletePlugin,
    enumPlugin,
    errorsPlugin,
    expressionStatementPlugin,
    functionPlugin,
    generatorPlugin,
    identifierPlugin,
    literalPlugin,
    doWhilePlugin,
    forPlugin,
    forInPlugin,
    forOfPlugin,
    luaTablePlugin,
    exportPlugin,
    importPlugin,
    namespacePlugin,
    returnPlugin,
    sourceFilePlugin,
    switchPlugin,
    templatePlugin,
    todoMoveSomewherePlugin,
    typeofPlugin,
    unaryExpressionPlugin,
    variablePlugin,
];
