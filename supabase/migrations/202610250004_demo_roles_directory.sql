begin;
create or replace function lms.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into lms.profiles(id,display_name,role)
 values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''),
 case when new.raw_user_meta_data->>'role'='teacher' then 'teacher' else 'student' end);
 return new;
end $$;
create function lms.list_people() returns table(id uuid,display_name text,role text)
language sql stable security definer set search_path = '' as $$
 select person.id,person.display_name,person.role
 from lms.profiles person join lms.profiles viewer on viewer.id=auth.uid()
 where person.role<>viewer.role
 order by lower(person.display_name),person.id
$$;
revoke all on function lms.list_people() from public,anon;
grant execute on function lms.list_people() to authenticated;
commit;
