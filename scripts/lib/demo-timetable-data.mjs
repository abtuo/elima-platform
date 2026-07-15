export const DEMO_SCHOOL_ID = "a1111111-1111-4111-8111-111111110001";
export const DEMO_WEEK_START = "2026-06-22";
export const DEMO_WEEK_END = "2026-06-27";

const course = (date, start, end, className, subject, teacherEmail, room) => ({ date, start, end, className, subject, teacherEmail, room });

export const demoTimetable = [
  course("2026-06-22", "08:00", "09:30", "6ème B", "Mathématiques", "enseignant.serge@elima.school", "Bâtiment A · Salle 3"),
  course("2026-06-22", "09:45", "10:45", "6ème B", "Français", "teacher.abidjan@seed-elima.invalid", "Bâtiment A · Salle 3"),
  course("2026-06-22", "11:00", "12:30", "6ème B", "Histoire-Géographie", "enseignant.ange@elima.school", "Bâtiment A · Salle 3"),
  course("2026-06-22", "08:00", "09:00", "3ème A", "Français", "enseignant.nadia@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-22", "09:45", "11:15", "3ème A", "Mathématiques", "enseignant.serge@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-22", "11:30", "13:00", "3ème A", "Physique-Chimie", "enseignant.karim@elima.school", "Laboratoire Physique-Chimie"),
  course("2026-06-23", "08:00", "09:00", "6ème B", "Anglais", "enseignant.claire@elima.school", "Bâtiment A · Salle 3"),
  course("2026-06-23", "09:15", "10:45", "6ème B", "SVT", "enseignant.mireille@elima.school", "Laboratoire SVT"),
  course("2026-06-23", "14:00", "15:30", "6ème B", "EPS", "enseignant.roland@elima.school", "Terrain multisports"),
  course("2026-06-23", "08:00", "09:30", "3ème A", "Mathématiques", "enseignant.serge@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-23", "09:45", "10:45", "3ème A", "Histoire-Géographie", "enseignant.ange@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-23", "11:00", "12:00", "3ème A", "Anglais", "enseignant.claire@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-24", "08:00", "09:30", "6ème B", "Français", "teacher.abidjan@seed-elima.invalid", "Bâtiment A · Salle 3"),
  course("2026-06-24", "10:00", "11:00", "6ème B", "Mathématiques", "enseignant.serge@elima.school", "Bâtiment A · Salle 3"),
  course("2026-06-24", "08:00", "09:30", "3ème A", "Physique-Chimie", "enseignant.karim@elima.school", "Laboratoire Physique-Chimie"),
  course("2026-06-24", "10:00", "11:30", "3ème A", "Français", "enseignant.nadia@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-25", "08:00", "09:30", "6ème B", "Mathématiques", "enseignant.serge@elima.school", "Bâtiment A · Salle 3"),
  course("2026-06-25", "10:00", "11:00", "6ème B", "Français", "teacher.abidjan@seed-elima.invalid", "Bâtiment A · Salle 3"),
  course("2026-06-25", "14:00", "15:30", "6ème B", "SVT", "enseignant.mireille@elima.school", "Laboratoire SVT"),
  course("2026-06-25", "08:00", "09:00", "3ème A", "Histoire-Géographie", "enseignant.ange@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-25", "09:45", "11:15", "3ème A", "Mathématiques", "enseignant.serge@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-25", "11:30", "12:30", "3ème A", "Anglais", "enseignant.claire@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-26", "08:00", "09:00", "6ème B", "Anglais", "enseignant.claire@elima.school", "Bâtiment A · Salle 3"),
  course("2026-06-26", "10:00", "11:30", "6ème B", "EPS", "enseignant.roland@elima.school", "Terrain multisports"),
  course("2026-06-26", "08:00", "09:30", "3ème A", "Français", "enseignant.nadia@elima.school", "Bâtiment B · Salle 6"),
  course("2026-06-26", "10:00", "11:30", "3ème A", "SVT", "enseignant.mireille@elima.school", "Laboratoire SVT"),
  course("2026-06-26", "14:00", "15:00", "3ème A", "EPS", "enseignant.roland@elima.school", "Terrain multisports"),
];
