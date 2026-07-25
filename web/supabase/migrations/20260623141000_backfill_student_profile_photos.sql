alter table public.students add column if not exists photo_url text;

with numbered_students as (
  select
    id,
    row_number() over (partition by school_id order by full_name, id) as rn
  from public.students
  where photo_url is null
)
update public.students s
set photo_url = format('/student_profil_%s.png', ((numbered_students.rn - 1) % 5) + 1)
from numbered_students
where s.id = numbered_students.id;
