update public.schools
set currency = 'FCFA'
where currency is null or currency = 'XOF';
