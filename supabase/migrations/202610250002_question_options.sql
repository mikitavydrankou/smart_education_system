begin;
create or replace function lms.valid_question(question jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare kind text := question->>'type'; answer jsonb := question->'answer'; option_count integer;
begin
 if nullif(question->>'id','') is null or nullif(trim(question->>'prompt'),'') is null or kind is null or answer is null or answer='null'::jsonb then return false; end if;
 if kind<>'short' then
   if jsonb_typeof(question->'options') is distinct from 'array' then return false; end if;
   option_count := jsonb_array_length(question->'options');
   if option_count<2 then return false; end if;
   if exists(select 1 from jsonb_array_elements(question->'options') item where jsonb_typeof(item)<>'string' or nullif(trim(item#>>'{}'),'') is null) then return false; end if;
   if (select count(distinct trim(item#>>'{}')) from jsonb_array_elements(question->'options') item)<>option_count then return false; end if;
 end if;
 if kind='single' then return jsonb_typeof(answer)='number' and (answer#>>'{}') ~ '^[0-9]+$' and (answer#>>'{}')::numeric<option_count;
 elsif kind='boolean' then return jsonb_typeof(answer)='boolean' and option_count=2;
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
   if jsonb_typeof(answer)<>'object' or answer='{}'::jsonb then return false; end if;
   return (select count(*) from jsonb_each(answer))=option_count
    and not exists(select 1 from jsonb_array_elements_text(question->'options') pair where array_length(string_to_array(pair,'|'),1)<>2
      or nullif(trim(split_part(pair,'|',1)),'') is null or nullif(trim(split_part(pair,'|',2)),'') is null
      or (answer->>split_part(pair,'|',1)) is distinct from split_part(pair,'|',2))
    and (select count(*)=count(distinct split_part(pair,'|',1)) from jsonb_array_elements_text(question->'options') pair)
    and (select count(*)=count(distinct split_part(pair,'|',2)) from jsonb_array_elements_text(question->'options') pair);
 end if;
 return false;
exception when others then return false;
end $$;
revoke all on function lms.valid_question(jsonb) from public,anon,authenticated;
commit;
