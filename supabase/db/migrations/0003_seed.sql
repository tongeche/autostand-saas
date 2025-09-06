with o as (
  insert into orgs (id, name, slug) values (gen_random_uuid(),'Demo Motors','demo')
  on conflict do nothing
  returning id
)
insert into pipeline_stages (id, org_id, name, position, is_closed)
select gen_random_uuid(), (select id from o), name, pos, closed
from (values
  ('New',1,false),('Qualified',2,false),('Contacted',3,false),('Test-Drive',4,false),
  ('Financing',5,false),('Negotiation',6,false),('Won',7,true),('Lost',8,true)
) as s(name,pos,closed)
on conflict do nothing;
