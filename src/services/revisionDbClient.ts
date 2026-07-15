import { mainDbClient } from "./mainDbClient";

/**
 * La révision et le scolaire partagent le même projet et la même session.
 * auth.uid() est ainsi identique pour les données scolaires, la progression,
 * les quiz, les fiches et les scans.
 */
export const revisionDbClient = mainDbClient;
