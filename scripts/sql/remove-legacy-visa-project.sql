begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

select cron.unschedule(jobid) from cron.job
where jobname in ('check-expiring-subscriptions-daily','cleanup-chat-rate-limits-hourly','telegram-poll-every-minute');

drop policy if exists "Admins read screenshots" on storage.objects;
drop policy if exists "Users can delete their own receipts" on storage.objects;
drop policy if exists "Users can update own receipts" on storage.objects;
drop policy if exists "Users can upload receipts" on storage.objects;
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.claim_alerts(text,integer) restrict;
drop function if exists public.complete_alert(uuid,boolean,text,text) restrict;
drop function if exists public.get_alert_delivery_stats() restrict;
drop function if exists public.get_bot_detection_dashboard(integer) restrict;

drop table if exists
  public.alert_decisions,
  public.alert_delivery_log,
  public.alert_queue,
  public.bot_detection_events,
  public.browser_verifications,
  public.browser_worker_tokens,
  public.packages,
  public.profiles,
  public.provider_centers,
  public.site_settings,
  public.stealth_metrics,
  public.subscriptions,
  public.telegram_bot_state,
  public.telegram_link_log,
  public.user_roles,
  public.visa_open_events
restrict;

drop function if exists public.handle_new_user() restrict;
drop function if exists public.has_role(uuid,public.app_role) restrict;
drop function if exists public.update_updated_at_column() restrict;
drop type if exists public.app_role restrict;

commit;
