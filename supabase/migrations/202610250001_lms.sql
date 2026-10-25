begin;
create schema if not exists lms;
grant usage on schema lms to anon, authenticated;

create table lms.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'student' check (role in ('student','teacher')),
  preferred_style text check (preferred_style in ('visual','auditory','kinesthetic')),
  assessment_completed boolean not null default false,
  assessment_answers jsonb not null default '{}'
);
create function lms.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into lms.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''));
  return new;
end $$;
create trigger lms_create_profile after insert on auth.users for each row execute function lms.create_profile();
insert into lms.profiles(id,display_name) select id,coalesce(raw_user_meta_data->>'display_name','') from auth.users on conflict do nothing;

create table lms.courses (
 id uuid primary key default gen_random_uuid(), title text not null, description text not null default '',
 teacher_id uuid not null references lms.profiles(id), published boolean not null default false
);
create view lms.course_catalog as select courses.id,courses.title,courses.description,courses.teacher_id,courses.published,profiles.display_name as teacher_name from lms.courses courses join lms.profiles profiles on profiles.id=courses.teacher_id where courses.published;
grant select on lms.course_catalog to anon,authenticated;
create table lms.assessment_config (
 id boolean primary key default true check(id), source_url text not null default 'https://www.educationplanner.org/students/self-assessments/learning-styles',
 version text not null default 'pending', approved boolean not null default false, questions jsonb not null default '[]' check(jsonb_typeof(questions)='array')
);
insert into lms.assessment_config(id) values(true);
create table lms.assessment_results (
 student_id uuid primary key references lms.profiles(id) on delete cascade, version text not null, answers jsonb not null, scores jsonb not null,
 original_style text not null check(original_style in ('visual','auditory','kinesthetic')), completed_at timestamptz not null default now()
);
create table lms.enrollments (
 course_id uuid references lms.courses(id) on delete cascade, student_id uuid references lms.profiles(id) on delete cascade,
 status text not null check(status in ('pending','approved','rejected')), primary key(course_id,student_id)
);
create table lms.lessons (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references lms.courses(id) on delete cascade,
 title text not null, position integer not null check(position > 0), published boolean not null default false,
 current_revision_id uuid, draft_revision_id uuid, unique(course_id,position)
);
create table lms.revisions (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references lms.lessons(id) on delete cascade,
 title text not null, position integer not null check(position>0), content jsonb not null default '[]', questions jsonb not null default '[]', threshold numeric not null default 70 check(threshold > 0 and threshold <= 100),
 created_at timestamptz not null default now()
);
alter table lms.lessons add constraint current_revision foreign key(current_revision_id) references lms.revisions(id);
alter table lms.lessons add constraint draft_revision foreign key(draft_revision_id) references lms.revisions(id);
create table lms.lesson_progress (
 student_id uuid references lms.profiles(id) on delete cascade, lesson_id uuid references lms.lessons(id) on delete cascade,
 revision_id uuid not null references lms.revisions(id), passed boolean not null default false,
 primary key(student_id,lesson_id)
);
create table lms.attempts (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references lms.profiles(id),
 lesson_id uuid not null references lms.lessons(id), revision_id uuid not null references lms.revisions(id),
 preview boolean not null default false, answers jsonb, score integer, total integer, percentage numeric, passed boolean,
 created_at timestamptz not null default now(), submitted_at timestamptz
);
create index on lms.lessons(course_id,position);
create index on lms.attempts(student_id,lesson_id);

create function lms.owns_course(course uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from lms.courses where id=course and teacher_id=auth.uid())
$$;
create function lms.can_access_lesson(lesson uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from lms.lessons target join lms.courses course on course.id=target.course_id
 where target.id=lesson and (course.teacher_id=auth.uid() or (
 target.published and course.published
 and exists(select 1 from lms.profiles where id=auth.uid() and assessment_completed)
 and exists(select 1 from lms.enrollments where course_id=course.id and student_id=auth.uid() and status='approved')
 and not exists(select 1 from lms.lessons previous where previous.course_id=course.id and previous.published and previous.position<target.position
 and not exists(select 1 from lms.lesson_progress progress where progress.lesson_id=previous.id and progress.student_id=auth.uid() and progress.passed)))))
$$;

alter table lms.profiles enable row level security;
alter table lms.assessment_config enable row level security;
alter table lms.assessment_results enable row level security;
create policy assessment_config_read on lms.assessment_config for select to authenticated using(approved);
create policy assessment_results_read on lms.assessment_results for select to authenticated using(student_id=auth.uid());
grant select on lms.assessment_config,lms.assessment_results to authenticated;
alter table lms.courses enable row level security;
alter table lms.enrollments enable row level security;
alter table lms.lessons enable row level security;
alter table lms.revisions enable row level security;
alter table lms.lesson_progress enable row level security;
alter table lms.attempts enable row level security;
create policy profiles_read on lms.profiles for select to authenticated using(id=auth.uid() or exists(select 1 from lms.enrollments where student_id=profiles.id and lms.owns_course(course_id)));
create policy courses_read on lms.courses for select using(published or teacher_id=auth.uid());
create policy enrollment_read on lms.enrollments for select to authenticated using(student_id=auth.uid() or lms.owns_course(course_id));
create policy lessons_read on lms.lessons for select to authenticated using(lms.owns_course(course_id) or (published and exists(select 1 from lms.enrollments where course_id=lessons.course_id and student_id=auth.uid() and status='approved')));
create policy progress_read on lms.lesson_progress for select to authenticated using(student_id=auth.uid() or exists(select 1 from lms.lessons where id=lesson_id and lms.owns_course(course_id)));
create policy attempts_read on lms.attempts for select to authenticated using(student_id=auth.uid());
grant select on lms.courses to anon,authenticated;
grant select on lms.profiles,lms.enrollments,lms.lessons,lms.lesson_progress,lms.attempts to authenticated;

create function lms.save_course(payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare course uuid := coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
begin
 if not exists(select 1 from lms.profiles where id=auth.uid() and role='teacher') then raise exception 'Teacher role required' using errcode='42501'; end if;
 if nullif(trim(payload->>'title'),'') is null then raise exception 'Title required'; end if;
 if exists(select 1 from lms.courses where id=course) and not lms.owns_course(course) then raise exception 'Access denied' using errcode='42501'; end if;
 insert into lms.courses(id,title,description,teacher_id,published) values(course,payload->>'title',coalesce(payload->>'description',''),auth.uid(),coalesce((payload->>'published')::boolean,false))
 on conflict(id) do update set title=excluded.title,description=excluded.description,published=excluded.published;
 return course;
end $$;
create function lms.request_enrollment(course uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from lms.profiles where id=auth.uid() and role='student' and assessment_completed) or not exists(select 1 from lms.courses where id=course and published) then raise exception 'Access denied: complete assessment first' using errcode='42501'; end if;
 insert into lms.enrollments values(course,auth.uid(),'pending') on conflict(course_id,student_id) do update set status='pending' where lms.enrollments.status='rejected';
end $$;
create function lms.review_enrollment(course uuid,student uuid,approve boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not lms.owns_course(course) then raise exception 'Access denied' using errcode='42501'; end if;
 update lms.enrollments set status=case when approve then 'approved' else 'rejected' end where course_id=course and student_id=student;
end $$;

create function lms.valid_question(question jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare kind text := question->>'type'; answer jsonb := question->'answer'; option_count integer;
begin
 if nullif(question->>'id','') is null or nullif(trim(question->>'prompt'),'') is null or kind is null or answer is null or answer='null'::jsonb then return false; end if;
 if kind in ('single','multiple','ordering') then
   if jsonb_typeof(question->'options') is distinct from 'array' then return false; end if;
   option_count := jsonb_array_length(question->'options');
   if option_count<2 then return false; end if;
 end if;
 if kind='single' then return jsonb_typeof(answer)='number' and (answer#>>'{}') ~ '^[0-9]+$' and (answer#>>'{}')::numeric<option_count;
 elsif kind='boolean' then return jsonb_typeof(answer)='boolean';
 elsif kind='multiple' then
   if jsonb_typeof(answer)<>'array' or jsonb_array_length(answer)=0 then return false; end if;
   return not exists(select 1 from jsonb_array_elements(answer) item where jsonb_typeof(item)<>'number' or (item#>>'{}') !~ '^[0-9]+$' or (item#>>'{}')::numeric>=option_count)
   and (select count(*)=count(distinct item) from jsonb_array_elements(answer) item);
 elsif kind='short' then
   if jsonb_typeof(answer)<>'array' or jsonb_array_length(answer)=0 then return false; end if;
   return not exists(select 1 from jsonb_array_elements(answer) item where jsonb_typeof(item)<>'string' or nullif(trim(item#>>'{}'),'') is null);
 elsif kind='ordering' then
   if jsonb_typeof(answer)<>'array' or jsonb_array_length(answer)<>option_count then return false; end if;
   return answer @> (question->'options') and answer <@ (question->'options') and (select count(*)=count(distinct item) from jsonb_array_elements(answer) item);
 elsif kind='matching' then
   if jsonb_typeof(answer)<>'object' or answer='{}'::jsonb or jsonb_typeof(question->'options') is distinct from 'array' then return false; end if;
   return (select count(*) from jsonb_each(answer))=jsonb_array_length(question->'options')
    and not exists(select 1 from jsonb_array_elements_text(question->'options') pair where array_length(string_to_array(pair,'|'),1)<>2
      or nullif(trim(split_part(pair,'|',1)),'') is null or nullif(trim(split_part(pair,'|',2)),'') is null
      or (answer->>split_part(pair,'|',1)) is distinct from split_part(pair,'|',2))
    and (select count(*)=count(distinct split_part(pair,'|',1)) from jsonb_array_elements_text(question->'options') pair)
    and (select count(*)=count(distinct split_part(pair,'|',2)) from jsonb_array_elements_text(question->'options') pair);
 end if;
 return false;
exception when others then return false;
end $$;

create function lms.save_lesson(payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare lesson uuid := coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid()); course uuid := (payload->>'course_id')::uuid;
 revision uuid := gen_random_uuid(); variant jsonb; question jsonb; block jsonb; style text; used_styles text[] := '{}'; used_ids text[] := '{}';
 content jsonb := coalesce(payload->'content','[]'); questions jsonb := coalesce(payload->'questions','[]'); publishing boolean := coalesce((payload->>'published')::boolean,false);
begin
 if not lms.owns_course(course) or exists(select 1 from lms.lessons where id=lesson and course_id<>course) then raise exception 'Access denied' using errcode='42501'; end if;
 if nullif(trim(payload->>'title'),'') is null then raise exception 'Title required'; end if;
 if jsonb_typeof(content)<>'array' or jsonb_typeof(questions)<>'array' then raise exception 'Invalid content'; end if;
 if publishing and (jsonb_array_length(content)=0 or jsonb_array_length(questions)=0) then raise exception 'Content and test required'; end if;
 for variant in select value from jsonb_array_elements(content) loop
   if nullif(variant->>'id','') is null or (variant->>'id')=any(used_ids) then raise exception 'Invalid variant ID'; end if;
   used_ids := array_append(used_ids,variant->>'id');
   if jsonb_typeof(variant->'styles') is distinct from 'array' or jsonb_typeof(variant->'blocks') is distinct from 'array' then raise exception 'Invalid variant'; end if;
   if publishing and (jsonb_array_length(variant->'styles')=0 or jsonb_array_length(variant->'blocks')=0) then raise exception 'Empty variant'; end if;
   for style in select jsonb_array_elements_text(variant->'styles') loop
     if style not in ('visual','auditory','kinesthetic') or style=any(used_styles) then raise exception 'Duplicate or invalid style'; end if;
     used_styles := array_append(used_styles,style);
   end loop;
   for block in select value from jsonb_array_elements(variant->'blocks') loop
     if nullif(block->>'id','') is null or (block->>'id')=any(used_ids) or coalesce(block->>'type','') not in ('text','heading','list','image','audio','practice','pdf') then raise exception 'Invalid block'; end if;
     used_ids := array_append(used_ids,block->>'id');
     if publishing then
       if block->>'type' in ('image','audio','pdf') then
         if coalesce(block->>'url','') !~ '^(https://|/api/lms/files\?path=)' then raise exception 'Safe media URL required'; end if;
         if block->>'type'='audio' and nullif(trim(block->>'transcript'),'') is null then raise exception 'Audio transcript required'; end if;
       elsif nullif(trim(block->>'text'),'') is null then raise exception 'Block text required'; end if;
     end if;
   end loop;
 end loop;
 if publishing then
   if exists(select 1 from jsonb_array_elements(questions) item group by item->>'id' having count(*)>1) then raise exception 'Duplicate question IDs'; end if;
   for question in select value from jsonb_array_elements(questions) loop
     if not lms.valid_question(question) then raise exception 'Invalid question'; end if;
   end loop;
 end if;
 insert into lms.lessons(id,course_id,title,position,published) values(lesson,course,payload->>'title',(payload->>'position')::integer,publishing)
 on conflict(id) do update set title=case when publishing or not lms.lessons.published then excluded.title else lms.lessons.title end,
 position=case when publishing or not lms.lessons.published then excluded.position else lms.lessons.position end,
 published=lms.lessons.published or publishing;
 insert into lms.revisions(id,lesson_id,title,position,content,questions,threshold) values(revision,lesson,payload->>'title',(payload->>'position')::integer,content,questions,coalesce((payload->>'threshold')::numeric,70));
 update lms.lessons set draft_revision_id=case when publishing then null else revision end,
 current_revision_id=case when publishing then revision else current_revision_id end where id=lesson;
 return lesson;
end $$;

create function lms.public_question(question jsonb) returns jsonb language sql immutable set search_path = '' as $$
 select case when question->>'type'='matching' then (question-'answer'-'options') || jsonb_build_object(
   'options',(select jsonb_agg(key order by key) from jsonb_each_text(question->'answer')),
   'rightOptions',(select jsonb_agg(right_value order by right_value) from (select distinct value as right_value from jsonb_each_text(question->'answer')) rights))
 when question->>'type'='ordering' then (question-'answer') || jsonb_build_object('options',(select jsonb_agg(item order by item) from jsonb_array_elements(question->'options') item))
 else question-'answer' end
$$;
create function lms.get_lesson(lesson uuid,preview boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare target lms.lessons; revision lms.revisions; owner boolean;
begin
 if not lms.can_access_lesson(lesson) then raise exception 'Lesson unavailable' using errcode='42501'; end if;
 select * into target from lms.lessons where id=lesson;
 owner := lms.owns_course(target.course_id);
 if owner and preview and exists(select 1 from lms.lessons previous where previous.course_id=target.course_id and previous.published and previous.position<target.position
 and not exists(select 1 from lms.attempts attempt where attempt.student_id=auth.uid() and attempt.lesson_id=previous.id and attempt.preview and attempt.passed)) then
   raise exception 'Lesson unavailable' using errcode='42501';
 end if;
 if not owner then
   insert into lms.lesson_progress(student_id,lesson_id,revision_id) values(auth.uid(),lesson,target.current_revision_id) on conflict do nothing;
   select revisions.* into revision from lms.revisions revisions join lms.lesson_progress progress on progress.revision_id=revisions.id where progress.student_id=auth.uid() and progress.lesson_id=lesson;
 else select * into revision from lms.revisions where id=case when preview then coalesce(target.current_revision_id,target.draft_revision_id) else coalesce(target.draft_revision_id,target.current_revision_id) end;
 end if;
 return to_jsonb(target)||jsonb_build_object('title',revision.title,'position',revision.position,'revision_id',revision.id,'content',revision.content,'threshold',revision.threshold,'questions',
 case when owner and not preview then revision.questions else coalesce((select jsonb_agg(lms.public_question(item)) from jsonb_array_elements(revision.questions) item),'[]') end,
 'passed',coalesce((select passed from lms.lesson_progress where student_id=auth.uid() and lesson_id=lesson),false));
end $$;
create function lms.start_attempt(lesson uuid,preview boolean default false) returns uuid language plpgsql security definer set search_path = '' as $$
declare payload jsonb; attempt uuid;
begin
 payload := lms.get_lesson(lesson,preview);
 if preview<>lms.owns_course((payload->>'course_id')::uuid) then raise exception 'Invalid attempt mode' using errcode='42501'; end if;
 insert into lms.attempts(student_id,lesson_id,revision_id,preview) values(auth.uid(),lesson,(payload->>'revision_id')::uuid,preview) returning id into attempt;
 return attempt;
end $$;
create function lms.normalize_answer(answer text) returns text language sql immutable set search_path = '' as $$ select lower(regexp_replace(trim(answer),'\s+',' ','g')) $$;
create function lms.submit_attempt(attempt uuid,answers jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare target lms.attempts; revision lms.revisions; question jsonb; supplied jsonb; expected jsonb; correct boolean; earned integer := 0; count_questions integer; percent numeric;
begin
 select * into target from lms.attempts where id=attempt and student_id=auth.uid() for update;
 if not found then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 if target.submitted_at is not null then return jsonb_build_object('id',target.id,'score',target.score,'total',target.total,'percentage',target.percentage,'passed',target.passed,'preview',target.preview); end if;
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

create function lms.save_assessment(answers jsonb,selected_style text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare config lms.assessment_config; question jsonb; choice jsonb; style text; question_id text;
 scores jsonb := '{"visual":0,"auditory":0,"kinesthetic":0}'; max_score integer; tied jsonb; result_style text; complete boolean := true;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform 1 from lms.profiles where id=auth.uid() for update;
 if jsonb_typeof(answers) is distinct from 'object' then raise exception 'Invalid assessment answers'; end if;
 if exists(select 1 from lms.assessment_results where student_id=auth.uid()) then return jsonb_build_object('completed',true,'style',(select original_style from lms.assessment_results where student_id=auth.uid())); end if;
 select * into config from lms.assessment_config where id;
 if not config.approved or jsonb_array_length(config.questions)=0 then
   if selected_style is not null then raise exception 'EducationPlanner questionnaire pending source and reuse verification'; end if;
   update lms.profiles set assessment_answers=answers where id=auth.uid();
   return jsonb_build_object('completed',false,'source_pending',true);
 end if;
 for question in select value from jsonb_array_elements(config.questions) loop
   question_id := question->>'id';
   if not answers ? question_id then complete := false; continue; end if;
   if jsonb_typeof(answers->question_id)<>'number' or (answers->>question_id) !~ '^[0-9]+$' then raise exception 'Invalid assessment choice'; end if;
   choice := question->'options'->((answers->>question_id)::integer);
   style := choice->>'style';
   if style is null or style not in ('visual','auditory','kinesthetic') then raise exception 'Invalid assessment choice'; end if;
   scores := jsonb_set(scores,array[style],to_jsonb((scores->>style)::integer+1));
 end loop;
 if exists(select 1 from jsonb_object_keys(answers) answer_id where not exists(select 1 from jsonb_array_elements(config.questions) item where item->>'id'=answer_id)) then raise exception 'Unknown assessment question'; end if;
 update lms.profiles set assessment_answers=answers where id=auth.uid();
 if not complete then return jsonb_build_object('completed',false,'source_pending',false); end if;
 select max(value::integer) into max_score from jsonb_each_text(scores);
 select jsonb_agg(key order by key) into tied from jsonb_each_text(scores) where value::integer=max_score;
 if jsonb_array_length(tied)>1 and selected_style is null then return jsonb_build_object('completed',false,'tied_styles',tied,'scores',scores); end if;
 result_style := coalesce(selected_style,tied->>0);
 if not tied ? result_style then raise exception 'Selected style must be one of the highest scoring styles'; end if;
 insert into lms.assessment_results(student_id,version,answers,scores,original_style) values(auth.uid(),config.version,answers,scores,result_style) on conflict do nothing;
 update lms.profiles set preferred_style=result_style,assessment_completed=true where id=auth.uid();
 return jsonb_build_object('completed',true,'style',result_style,'scores',scores);
end $$;
create function lms.set_preferred_style(style text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if style not in ('visual','auditory','kinesthetic') then raise exception 'Invalid style'; end if;
 update lms.profiles set preferred_style=style where id=auth.uid();
end $$;

create function lms.can_read_file(object_name text) returns boolean language plpgsql stable security definer set search_path = '' as $$
declare parts text[] := string_to_array(object_name,'/'); target lms.lessons; pinned_revision uuid; encoded_url text;
begin
 if auth.uid() is null or array_length(parts,1)<>3 or parts[3] !~ '^[A-Za-z0-9._-]+$' then return false; end if;
 select * into target from lms.lessons where id=parts[2]::uuid and course_id=parts[1]::uuid;
 if not found then return false; end if;
 if lms.owns_course(target.course_id) then return true; end if;
 if not lms.can_access_lesson(target.id) then return false; end if;
 select revision_id into pinned_revision from lms.lesson_progress where lesson_id=target.id and student_id=auth.uid();
 pinned_revision := coalesce(pinned_revision,target.current_revision_id);
 encoded_url := '/api/lms/files?path='||replace(object_name,'/','%2F');
 return exists(select 1 from lms.revisions revision cross join lateral jsonb_array_elements(revision.content) variant
 cross join lateral jsonb_array_elements(variant->'blocks') block where revision.id=pinned_revision
 and block->>'type' in ('image','audio','pdf') and block->>'url' in (encoded_url,'/api/lms/files?path='||object_name));
exception when invalid_text_representation then return false;
end $$;

revoke all on all functions in schema lms from public,anon,authenticated;
grant execute on function lms.owns_course(uuid),lms.can_access_lesson(uuid),lms.can_read_file(text) to authenticated;
grant execute on function lms.save_course(jsonb),lms.request_enrollment(uuid),lms.review_enrollment(uuid,uuid,boolean),lms.save_lesson(jsonb),lms.get_lesson(uuid,boolean),lms.start_attempt(uuid,boolean),lms.submit_attempt(uuid,jsonb),lms.save_assessment(jsonb,text),lms.set_preferred_style(text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('lms-files','lms-files',false,20971520,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/ogg','audio/wav','application/pdf']) on conflict(id) do nothing;
create policy lms_file_upload on storage.objects for insert to authenticated with check(bucket_id='lms-files' and lms.owns_course((storage.foldername(name))[1]::uuid) and exists(select 1 from lms.lessons where id=(storage.foldername(name))[2]::uuid and course_id=(storage.foldername(name))[1]::uuid) and (select role='teacher' from lms.profiles where id=auth.uid()) and (coalesce(metadata->>'mimetype','') not like 'image/%' or coalesce((metadata->>'size')::bigint,0)<=5242880));
create policy lms_file_read on storage.objects for select to authenticated using(bucket_id='lms-files' and lms.can_read_file(name));
commit;
