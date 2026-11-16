-- Integration assertions for a disposable PostgreSQL/Supabase test database.
-- Run as a database owner after all migrations. Never run against production.
-- Everything, including fixtures and helper functions, is rolled back.
begin;

create function pg_temp.check_true(ok boolean, label text)
returns text language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
  return 'OK: ' || label;
end $$;

create function pg_temp.check_denied(statement text, expected_state text, label text)
returns text language plpgsql as $$
declare failed boolean := false;
begin
  begin
    execute statement;
  exception when others then
    if sqlstate <> expected_state then
      raise exception 'FAIL: % expected SQLSTATE %, got % (%)', label, expected_state, sqlstate, sqlerrm;
    end if;
    failed := true;
  end;
  if not failed then raise exception 'FAIL: % unexpectedly succeeded', label; end if;
  return 'OK: ' || label;
end $$;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-aaaa-4000-8000-000000000001', 'qa-client-a@example.test', '{"full_name":"QA A"}'),
  ('00000000-aaaa-4000-8000-000000000002', 'qa-client-b@example.test', '{"full_name":"QA B"}'),
  ('00000000-aaaa-4000-8000-000000000003', 'qa-admin@example.test', '{"full_name":"QA Admin"}');
update public.profiles set is_admin = true where id = '00000000-aaaa-4000-8000-000000000003';

insert into public.tours (id, slug, title, is_published) values
  ('00000000-bbbb-4000-8000-000000000001', 'qa-deploy-one', 'QA tour one', true),
  ('00000000-bbbb-4000-8000-000000000002', 'qa-deploy-two', 'QA tour two', true),
  ('00000000-bbbb-4000-8000-000000000003', 'qa-deploy-hidden', 'QA hidden tour', true);

insert into public.tour_requests
  (id, user_id, tour_id, requested_destination, preferred_date, status, confirmed_date, requested_seats, confirmed_seats, admin_notes)
values
  ('00000000-cccc-4000-8000-000000000001', '00000000-aaaa-4000-8000-000000000001', '00000000-bbbb-4000-8000-000000000001', 'QA pending', '2099-12-01', 'pending', null, '01', null, 'INTERNAL A'),
  ('00000000-cccc-4000-8000-000000000002', '00000000-aaaa-4000-8000-000000000002', '00000000-bbbb-4000-8000-000000000001', 'QA confirmed B', '2099-12-01', 'confirmed', '2099-12-01', null, '02', 'INTERNAL B'),
  ('00000000-cccc-4000-8000-000000000003', '00000000-aaaa-4000-8000-000000000001', '00000000-bbbb-4000-8000-000000000001', 'QA confirmed A', '2099-12-01', 'confirmed', '2099-12-01', '04', '03', 'INTERNAL C'),
  ('00000000-cccc-4000-8000-000000000004', '00000000-aaaa-4000-8000-000000000002', '00000000-bbbb-4000-8000-000000000002', 'QA other tour', '2099-12-01', 'confirmed', '2099-12-01', null, '05', null),
  ('00000000-cccc-4000-8000-000000000005', '00000000-aaaa-4000-8000-000000000002', '00000000-bbbb-4000-8000-000000000003', 'QA hidden tour', '2099-12-01', 'confirmed', '2099-12-01', null, '06', null);
update public.tours set is_published = false where id = '00000000-bbbb-4000-8000-000000000003';

insert into public.conversations (id, user_id) values
  ('00000000-dddd-4000-8000-000000000001', '00000000-aaaa-4000-8000-000000000001'),
  ('00000000-dddd-4000-8000-000000000002', '00000000-aaaa-4000-8000-000000000002'),
  ('00000000-dddd-4000-8000-000000000003', null);
insert into public.messages (conversation_id, user_id, role, content) values
  ('00000000-dddd-4000-8000-000000000001', '00000000-aaaa-4000-8000-000000000001', 'user', 'QA A message'),
  ('00000000-dddd-4000-8000-000000000001', null, 'assistant', 'QA assistant to A'),
  ('00000000-dddd-4000-8000-000000000002', '00000000-aaaa-4000-8000-000000000002', 'user', 'QA B message'),
  ('00000000-dddd-4000-8000-000000000003', null, 'user', 'QA orphan message'),
  ('00000000-dddd-4000-8000-000000000002', '00000000-aaaa-4000-8000-000000000001', 'user', 'QA historical cross-owner message');

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select pg_temp.check_true((select count(*) = 0 from public.tours where id = '00000000-bbbb-4000-8000-000000000003'), 'anon cannot read unpublished tours') as check_result;
select pg_temp.check_true((select count(*) = 0 from public.conversations where id::text like '00000000-dddd%'), 'anon cannot read conversations') as check_result;
select pg_temp.check_true((select count(*) = 0 from public.messages where content like 'QA%'), 'anon cannot read orphan or private messages') as check_result;
select pg_temp.check_denied('select id from public.tour_requests', '42501', 'anon cannot read requests') as check_result;
select pg_temp.check_denied('select * from public.get_admin_request_notes(array[]::uuid[])', '42501', 'anon cannot invoke internal-notes RPC') as check_result;
select pg_temp.check_true((select array_agg(seat order by seat) = array['02','03'] from public.get_occupied_seats('00000000-bbbb-4000-8000-000000000001', '2099-12-01')), 'occupied seats include only agency-confirmed seats for the selected tour') as check_result;
select pg_temp.check_true((select count(*) = 0 from public.get_occupied_seats(null, '2099-12-01')), 'missing tour does not aggregate all trips') as check_result;
select pg_temp.check_true((select count(*) = 0 from public.get_occupied_seats('00000000-bbbb-4000-8000-000000000001', null)), 'missing date gives no occupied seats') as check_result;
select pg_temp.check_true((select count(*) = 0 from public.get_occupied_seats('00000000-bbbb-4000-8000-000000000003', '2099-12-01')), 'unpublished tour does not expose occupancy') as check_result;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-aaaa-4000-8000-000000000001', true);
select pg_temp.check_true((select count(id) = 2 from public.tour_requests where id::text like '00000000-cccc%'), 'client sees only their own requests') as check_result;
select pg_temp.check_denied('select admin_notes from public.tour_requests', '42501', 'client cannot select internal-note column') as check_result;
select pg_temp.check_denied('select * from public.get_admin_request_notes(array[''00000000-cccc-4000-8000-000000000001'']::uuid[])', '42501', 'client cannot bypass note privacy with RPC') as check_result;
select pg_temp.check_denied('update public.profiles set is_admin = true where id = auth.uid()', 'P0001', 'client cannot promote themselves') as check_result;
select pg_temp.check_denied('update public.profiles set email = ''third-party@example.test'' where id = auth.uid()', 'P0001', 'client cannot replace verified email') as check_result;
select pg_temp.check_denied('update public.tour_requests set status = ''confirmed'' where id = ''00000000-cccc-4000-8000-000000000001''', 'P0001', 'client cannot confirm their request') as check_result;
select pg_temp.check_denied('update public.tour_requests set confirmed_seats = ''15'', meeting_point = ''fake'' where id = ''00000000-cccc-4000-8000-000000000001''', 'P0001', 'client cannot replace agency logistics') as check_result;
select pg_temp.check_denied('update public.tour_requests set reminder_sent_at = now() where id = ''00000000-cccc-4000-8000-000000000001''', 'P0001', 'client cannot mark reminders sent') as check_result;
select pg_temp.check_denied('insert into public.tour_requests(user_id, requested_destination, status) values(auth.uid(), ''QA invalid status'', ''confirmed'')', '42501', 'client cannot insert a confirmed request') as check_result;
select pg_temp.check_denied('insert into public.tour_requests(user_id, requested_destination) values(''00000000-aaaa-4000-8000-000000000002'', ''QA spoofed owner'')', '42501', 'client cannot insert for another owner') as check_result;
select pg_temp.check_denied('insert into public.tour_requests(user_id, tour_id) values(auth.uid(), ''00000000-bbbb-4000-8000-000000000003'')', 'P0001', 'client cannot request an unpublished tour') as check_result;
select pg_temp.check_denied('insert into public.tour_requests(user_id, requested_destination, requested_seats) values(auth.uid(), ''QA duplicate seats'', ''01,01'')', 'P0001', 'duplicate seat preferences rejected') as check_result;
select pg_temp.check_denied('insert into public.tour_requests(user_id, requested_destination, requested_seats) values(auth.uid(), ''QA out of range'', ''16'')', 'P0001', 'out-of-range seat preferences rejected') as check_result;
select pg_temp.check_denied('insert into public.tour_requests(user_id, requested_destination, requested_seats) values(auth.uid(), ''QA too many'', ''01,02'')', 'P0001', 'more seat preferences than travelers rejected') as check_result;

insert into public.tour_requests
  (id, user_id, requested_destination, requested_seats, confirmed_seats, confirmed_date, departure_time, meeting_point, departure_notes, admin_notes, reminder_sent_at)
values
  ('00000000-cccc-4000-8000-000000000006', auth.uid(), 'QA normal insert', ' 07 ', '15', '2099-12-01', '05:00', 'fake', 'fake', 'fake', now());
select pg_temp.check_true((select status = 'pending' and requested_seats = '07' and confirmed_seats is null and confirmed_date is null and departure_time is null and meeting_point is null and departure_notes is null and reminder_sent_at is null from public.tour_requests where id = '00000000-cccc-4000-8000-000000000006'), 'client insert strips agency fields and normalizes preferences') as check_result;
update public.tour_requests set status = 'cancelled' where id = '00000000-cccc-4000-8000-000000000001';
select pg_temp.check_true((select status = 'cancelled' from public.tour_requests where id = '00000000-cccc-4000-8000-000000000001'), 'client can cancel their pending request') as check_result;
select pg_temp.check_true((select count(*) = 2 from public.messages where content like 'QA%'), 'client reads own conversation and assistant reply only') as check_result;
select pg_temp.check_denied('insert into public.messages(conversation_id, user_id, role, content) values(''00000000-dddd-4000-8000-000000000002'', auth.uid(), ''user'', ''QA forged message'')', '42501', 'client cannot write into another conversation') as check_result;
select pg_temp.check_denied('insert into public.conversations(user_id) values(null)', '42501', 'client cannot create ownerless conversation') as check_result;

reset role;
select set_config('request.jwt.claim.sub', '00000000-aaaa-4000-8000-000000000003', true);
set local role authenticated;
select pg_temp.check_true((select count(id) = 6 from public.tour_requests where id::text like '00000000-cccc%'), 'admin reads all request rows through allowed columns') as check_result;
select pg_temp.check_true((select admin_notes = 'INTERNAL B' from public.get_admin_request_notes(array['00000000-cccc-4000-8000-000000000002']::uuid[])), 'admin can read internal notes through RPC') as check_result;
select pg_temp.check_true((select admin_notes is null from public.get_admin_request_notes(array['00000000-cccc-4000-8000-000000000006']::uuid[])), 'client insert stripped internal note on server') as check_result;
update public.tour_requests set admin_notes = 'ADMIN UPDATED', status = 'confirmed', confirmed_date = '2099-12-02', confirmed_seats = '07' where id = '00000000-cccc-4000-8000-000000000006';
select pg_temp.check_true((select status = 'confirmed' and confirmed_date = '2099-12-02' and confirmed_seats = '07' from public.tour_requests where id = '00000000-cccc-4000-8000-000000000006'), 'admin can confirm and set logistics') as check_result;
select pg_temp.check_true((select admin_notes = 'ADMIN UPDATED' from public.get_admin_request_notes(array['00000000-cccc-4000-8000-000000000006']::uuid[])), 'admin can update internal notes') as check_result;
select pg_temp.check_true((select count(*) = 0 from public.messages where content like 'QA%'), 'admin does not gain access to private chats') as check_result;

reset role;
rollback;
