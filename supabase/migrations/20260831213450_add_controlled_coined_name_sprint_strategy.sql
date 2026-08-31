alter table public.candidates
  drop constraint if exists candidates_strategy_check;

alter table public.candidates
  add constraint candidates_strategy_check
  check (strategy in (
    'suggestive',
    'metaphorical',
    'invented',
    'controlled_coined',
    'meaningful_compound',
    'arbitrary_real_word',
    'verified_root'
  ));
