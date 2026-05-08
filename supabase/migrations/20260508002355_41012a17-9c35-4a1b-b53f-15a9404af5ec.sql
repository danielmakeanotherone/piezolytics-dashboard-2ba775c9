UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'Daniel Fung')
WHERE email ILIKE 'danielfung%' OR raw_user_meta_data->>'full_name' ILIKE 'danielfung%';