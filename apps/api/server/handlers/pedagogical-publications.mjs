import { createPedagogicalHandler } from "../pedagogy/http.mjs";

export const createHandler = (dependencies = {}) => createPedagogicalHandler("publications", dependencies);
export default createHandler();

