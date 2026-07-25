update public.users
set full_name = case email
  when 'admin.abidjan@seed-elima.invalid' then 'Kouakou Léon Kobenan'
  when 'parent.mariam@elima.school' then 'Mme Mariam Koné'
  when 'parent.jean@elima.school' then 'M. Jean Kouamé'
  when 'parent.aminata@elima.school' then 'Mme Aminata Traoré'
  when 'parent.aboubacar@elima.school' then 'M. Aboubacar Tuo'
  else full_name
end
where email in (
  'admin.abidjan@seed-elima.invalid',
  'parent.mariam@elima.school',
  'parent.jean@elima.school',
  'parent.aminata@elima.school',
  'parent.aboubacar@elima.school'
);
