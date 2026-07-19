-- Les sessions guidées v3 proposent deux à trois indices progressifs.
alter table public.learning_question_hints
  drop constraint if exists learning_question_hints_level_check;

alter table public.learning_question_hints
  add constraint learning_question_hints_level_check check (level between 1 and 3);
