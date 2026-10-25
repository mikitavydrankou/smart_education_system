begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
insert into auth.users(id,email,raw_user_meta_data) values
 ('80000000-0000-0000-0000-000000000001','demo-teacher@example.test','{"role":"teacher","display_name":"Demo teacher"}'),
 ('80000000-0000-0000-0000-000000000002','demo-student@example.test','{"role":"student","display_name":"Demo student"}'),
 ('80000000-0000-0000-0000-000000000003','demo-invalid@example.test','{"role":"admin"}');
select is((select role from lms.profiles where id='80000000-0000-0000-0000-000000000001'),'teacher','teacher role chosen at signup');
select is((select role from lms.profiles where id='80000000-0000-0000-0000-000000000002'),'student','student role chosen at signup');
select is((select role from lms.profiles where id='80000000-0000-0000-0000-000000000003'),'student','other roles never created');
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000002',true);
select ok(exists(select 1 from lms.list_people() where id='80000000-0000-0000-0000-000000000001'),'student sees teacher without enrollment or assessment');
select ok(not exists(select 1 from lms.list_people() where role<>'teacher'),'student list only shows teachers');
select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000001',true);
select ok(exists(select 1 from lms.list_people() where id='80000000-0000-0000-0000-000000000002'),'teacher sees all students without enrollment');
select ok(not exists(select 1 from lms.list_people() where role<>'student'),'teacher list only shows students');
set local role anon;
select throws_ok($$select * from lms.list_people()$$,'42501',null,'guests cannot read directory');
select * from finish();
rollback;
