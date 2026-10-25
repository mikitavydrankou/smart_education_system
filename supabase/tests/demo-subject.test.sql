begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
insert into auth.users(id,email,raw_user_meta_data) values
 ('a0000000-0000-0000-0000-000000000001','subject-teacher@example.test','{"role":"teacher"}'),
 ('a0000000-0000-0000-0000-000000000002','subject-student@example.test','{"role":"student"}');
insert into lms.courses(id,title,teacher_id,published) values
 ('a1000000-0000-0000-0000-000000000001','Existing course','a0000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
select set_config('demo.course',lms.create_demo_course()::text,true);
select is(lms.create_demo_course()::text,current_setting('demo.course'),'teacher creation is idempotent');
select is((select count(*)::integer from lms.courses where teacher_id=auth.uid()),2,'existing course preserved and one demo created');
select is((select title from lms.courses where id=current_setting('demo.course')::uuid),'Jak działa Internet? — kurs demonstracyjny','real demo title');
select is((select count(*)::integer from lms.lessons where course_id=current_setting('demo.course')::uuid and published),3,'three published lessons');
reset role;
select ok((select bool_and(jsonb_array_length(revision.content)=3 and jsonb_array_length(revision.questions)=2 and revision.threshold=70) from lms.lessons lesson join lms.revisions revision on revision.id=lesson.current_revision_id where lesson.course_id=current_setting('demo.course')::uuid),'each lesson has three variants two questions and threshold70');
select is((select count(distinct question->>'type')::integer from lms.lessons lesson join lms.revisions revision on revision.id=lesson.current_revision_id cross join lateral jsonb_array_elements(revision.questions) question where lesson.course_id=current_setting('demo.course')::uuid),6,'all six question types');
set local role authenticated;
select is((select count(*)::integer from lms.attempts where student_id=auth.uid()),0,'creation does not create assessment progress');
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true);
select throws_ok($$select lms.create_demo_course()$$,'42501','Teacher role required','student denied');
set local role anon;
select throws_ok($$select lms.create_demo_course()$$,'42501',null,'guest denied');
select * from finish();
rollback;
