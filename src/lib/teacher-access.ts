const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function buildTeacherMatricule(teacherId: string) {
  return teacherId.replace(/-/g, "").slice(0, 5).toUpperCase();
}

export function generateTeacherInitialCode(length = 5) {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * CODE_CHARS.length);
    code += CODE_CHARS[idx];
  }
  return code;
}

export function isValidTeacherInitialCode(code: string) {
  return /^[A-Z0-9]{5}$/.test(code);
}

export function isValidTeacherNewPin(code: string) {
  return /^\d{5}$/.test(code);
}
