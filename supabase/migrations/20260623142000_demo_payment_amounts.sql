with ranked_payments as (
  select
    id,
    type,
    row_number() over (partition by school_id order by student_id, id) as rn
  from public.student_payments
  where type in ('inscription', 'scolarite')
)
update public.student_payments p
set amount = case
  when ranked_payments.type = 'inscription' then 25000
  else 35000 + (((ranked_payments.rn - 1) % 21) * 1000)
end
from ranked_payments
where p.id = ranked_payments.id;
