import { createPedagogicalHandler } from "../pedagogy/http.mjs";

export const createHandler = (dependencies = {}) => createPedagogicalHandler("versions", dependencies);
export default createHandler();

