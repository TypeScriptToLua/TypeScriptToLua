#!/usr/bin/env node

import {compile} from "./Compiler";

compile(process.argv.slice(2));
