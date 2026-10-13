type InputValue = string | boolean | InputValue[] | { [k: string]: InputValue };
/** Noir circuit inputs (noir_js InputMap). */
export type InputMap = { [k: string]: InputValue };
