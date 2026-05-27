-- Admin RLS policies: allow reading all proposals/contributions.
-- Access is gated at the application layer (email allowlist).

drop policy if exists "admin read proposals" on trail_proposals;
create policy "admin read proposals" on trail_proposals
  for select using (true);

drop policy if exists "admin update proposals" on trail_proposals;
create policy "admin update proposals" on trail_proposals
  for update using (true);

drop policy if exists "admin read contributions" on trail_contributions;
create policy "admin read contributions" on trail_contributions
  for select using (true);

drop policy if exists "admin update contributions" on trail_contributions;
create policy "admin update contributions" on trail_contributions
  for update using (true);
