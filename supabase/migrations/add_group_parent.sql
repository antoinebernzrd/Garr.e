-- Add parent_id to user_groups for subgroup support
ALTER TABLE user_groups
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES user_groups(id) ON DELETE SET NULL;
