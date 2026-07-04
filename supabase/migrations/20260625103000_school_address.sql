alter table public.schools add column if not exists address text;

update public.schools
set
  address = 'Rue des écoles, Cocody',
  city = 'Abidjan',
  country = 'Côte d’Ivoire'
where name = 'Collège Moderne d’Abidjan';
