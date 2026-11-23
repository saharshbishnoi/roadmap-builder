import MCR from "monocart-coverage-reports";
import options from "./mcr.options.mjs";
export default async function () { await MCR(options).generate(); }
