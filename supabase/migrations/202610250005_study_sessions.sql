begin;
create table lms.study_sessions (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references lms.profiles(id) on delete cascade,
 lesson_id uuid not null references lms.lessons(id) on delete cascade,
 revision_id uuid not null references lms.revisions(id) on delete cascade,
 variant_id text not null,
 preview boolean not null default false,
 completed_blocks text[] not null default '{}',
 completed_at timestamptz
);
create index on lms.study_sessions(student_id,lesson_id);
alter table lms.study_sessions enable row level security;
create policy study_sessions_read on lms.study_sessions for select to authenticated using(student_id=auth.uid());
revoke all on lms.study_sessions from public,anon,authenticated;
grant select on lms.study_sessions to authenticated;
alter table lms.attempts add column study_session_id uuid references lms.study_sessions(id);

alter function lms.save_lesson(jsonb) rename to save_lesson_base;
revoke all on function lms.save_lesson_base(jsonb) from public,anon,authenticated;
create function lms.save_lesson(payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare block jsonb; activity jsonb;
begin
 if coalesce((payload->>'published')::boolean,false) then
 for block in select material from jsonb_array_elements(payload->'content') variant cross join lateral jsonb_array_elements(variant->'blocks') material loop
   if block ? 'activity' then
     activity := block->'activity';
     if block->>'type'<>'practice' or jsonb_typeof(activity) is distinct from 'object'
       or coalesce(activity->>'type','') not in ('single','ordering')
       or not lms.valid_question(activity||jsonb_build_object('id',block->>'id','prompt',block->>'text')) then
       raise exception 'Invalid practice activity';
     end if;
   end if;
 end loop;
 end if;
 return lms.save_lesson_base(payload);
end $$;

create function lms.create_study_session(lesson uuid,variant text,preview boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare payload jsonb; material jsonb; session_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 payload := lms.get_lesson(lesson,preview);
 select item into material from jsonb_array_elements(payload->'content') item where item->>'id'=variant;
 if material is null or jsonb_array_length(material->'blocks')=0 then raise exception 'Variant unavailable'; end if;
 insert into lms.study_sessions(student_id,lesson_id,revision_id,variant_id,preview)
 values(auth.uid(),lesson,(payload->>'revision_id')::uuid,variant,preview) returning id into session_id;
 return jsonb_build_object('id',session_id,'completed_blocks','[]'::jsonb,'completed',false);
end $$;

create function lms.record_study_block(study uuid,block text,answer jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare target lms.study_sessions; payload jsonb; blocks jsonb; next_block jsonb; completed text[]; finished boolean;
begin
 select * into target from lms.study_sessions where id=study and student_id=auth.uid() for update;
 if not found then raise exception 'Study unavailable' using errcode='42501'; end if;
 payload := lms.get_lesson(target.lesson_id,target.preview);
 if (payload->>'revision_id')::uuid<>target.revision_id then raise exception 'Study unavailable' using errcode='42501'; end if;
 select item->'blocks' into blocks from jsonb_array_elements(payload->'content') item where item->>'id'=target.variant_id;
 if not exists(select 1 from jsonb_array_elements(blocks) item where item->>'id'=block) then raise exception 'Unknown study block'; end if;
 if target.completed_at is not null then
   return jsonb_build_object('id',target.id,'completed_blocks',target.completed_blocks,'completed',true);
 end if;
 select item into next_block from jsonb_array_elements(blocks) with ordinality material(item,position)
 where not (item->>'id'=any(target.completed_blocks)) order by position limit 1;
 if next_block->>'id' is distinct from block then raise exception 'Read blocks in order'; end if;
 if next_block->>'type'='practice' and next_block ? 'activity' then
   if coalesce(next_block->'activity'->>'type','') not in ('single','ordering')
     or not lms.valid_question((next_block->'activity')||jsonb_build_object('id',next_block->>'id','prompt',next_block->>'text')) then
     raise exception 'Invalid practice activity';
   end if;
   if answer is null or answer is distinct from next_block->'activity'->'answer' then raise exception 'Incorrect practice answer'; end if;
 end if;
 completed := array_append(target.completed_blocks,block);
 finished := cardinality(completed)=jsonb_array_length(blocks);
 update lms.study_sessions set completed_blocks=completed,completed_at=case when finished then now() else null end where id=study;
 return jsonb_build_object('id',target.id,'completed_blocks',completed,'completed',finished);
end $$;

drop function lms.start_attempt(uuid,boolean);
create function lms.start_attempt(lesson uuid,preview boolean default false,study uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare payload jsonb; attempt uuid; session lms.study_sessions;
begin
 payload := lms.get_lesson(lesson,preview);
 if preview<>lms.owns_course((payload->>'course_id')::uuid) then raise exception 'Invalid attempt mode' using errcode='42501'; end if;
 select * into session from lms.study_sessions where id=study and student_id=auth.uid()
 and lesson_id=lesson and revision_id=(payload->>'revision_id')::uuid and study_sessions.preview=start_attempt.preview
 and completed_at is not null for share;
 if not found then raise exception 'Complete lesson material first' using errcode='42501'; end if;
 insert into lms.attempts(student_id,lesson_id,revision_id,preview,study_session_id)
 values(auth.uid(),lesson,session.revision_id,preview,session.id) returning id into attempt;
 return attempt;
end $$;

create or replace function lms.submit_attempt(attempt uuid,answers jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare target lms.attempts; revision lms.revisions; question jsonb; supplied jsonb; expected jsonb; correct boolean; earned integer := 0; count_questions integer; percent numeric;
begin
 select * into target from lms.attempts where id=attempt and student_id=auth.uid() for update;
 if not found then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 if target.submitted_at is not null then return jsonb_build_object('id',target.id,'score',target.score,'total',target.total,'percentage',target.percentage,'passed',target.passed,'preview',target.preview); end if;
 if not exists(select 1 from lms.study_sessions session where session.id=target.study_session_id and session.student_id=auth.uid()
 and session.lesson_id=target.lesson_id and session.revision_id=target.revision_id and session.preview=target.preview and session.completed_at is not null) then
   raise exception 'Complete lesson material first' using errcode='42501';
 end if;
 if not lms.can_access_lesson(target.lesson_id) then raise exception 'Access denied' using errcode='42501'; end if;
 if jsonb_typeof(answers) is distinct from 'object' then raise exception 'Answers must be an object'; end if;
 select * into revision from lms.revisions where id=target.revision_id;
 count_questions := jsonb_array_length(revision.questions);
 if count_questions=0 then raise exception 'Test has no questions'; end if;
 for question in select value from jsonb_array_elements(revision.questions) loop
   supplied := answers->(question->>'id'); expected := question->'answer'; correct := false;
   if question->>'type'='short' then
     if jsonb_typeof(supplied)='string' and jsonb_typeof(expected)='array' then select exists(select 1 from jsonb_array_elements_text(expected) candidate where lms.normalize_answer(candidate)=lms.normalize_answer(supplied#>>'{}')) into correct; end if;
   elsif question->>'type'='multiple' then
     if jsonb_typeof(supplied)='array' and jsonb_typeof(expected)='array' then correct := supplied @> expected and supplied <@ expected and jsonb_array_length(supplied)=jsonb_array_length(expected); end if;
   else correct := supplied=expected;
   end if;
   if coalesce(correct,false) then earned := earned+1; end if;
 end loop;
 percent := earned*100.0/count_questions;
 update lms.attempts set answers=submit_attempt.answers,score=earned,total=count_questions,percentage=percent,passed=percent>=revision.threshold,submitted_at=now() where id=attempt;
 if not target.preview and percent>=revision.threshold then update lms.lesson_progress set passed=true where student_id=auth.uid() and lesson_id=target.lesson_id; end if;
 return jsonb_build_object('id',attempt,'score',earned,'total',count_questions,'percentage',percent,'passed',percent>=revision.threshold,'preview',target.preview);
end $$;

revoke all on function lms.save_lesson(jsonb),lms.create_study_session(uuid,text,boolean),lms.record_study_block(uuid,text,jsonb),lms.start_attempt(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function lms.save_lesson(jsonb),lms.create_study_session(uuid,text,boolean),lms.record_study_block(uuid,text,jsonb),lms.start_attempt(uuid,boolean,uuid) to authenticated;
commit;
