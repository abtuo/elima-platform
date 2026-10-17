import { createPedagogicalHandler } from "../pedagogy/http.mjs";

export const createHandler = (dependencies = {}) => createPedagogicalHandler("resources", dependencies);
export default createHandler();

