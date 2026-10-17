import { createPedagogicalHandler } from "../pedagogy/http.mjs";

export const createHandler = (dependencies = {}) => createPedagogicalHandler("validation", dependencies);
export default createHandler();

