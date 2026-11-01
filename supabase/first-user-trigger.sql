-- Run once in Supabase SQL Editor to create a demo profile and wallet
-- automatically whenever a new Auth user registers.
create or replace function public.handle_new_apex_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.demo_wallets (user_id, currency, balance)
  values (new.id, 'USD', 10000.00)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_apex_auth_user_created on auth.users;
create trigger on_apex_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_apex_user();
