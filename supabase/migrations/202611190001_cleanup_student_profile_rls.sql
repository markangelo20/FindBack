
-- FindBack Backend Security Improvement
-- Consolidate duplicate Student Profile SELECT policies.
--
-- Both existing policies allow authenticated users
-- to SELECT only their own student profile.
--
-- Keep: findback_read_own_profile
-- Remove: Students can view own profile
--
-- No student records are modified.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'student_profiles'
          AND policyname = 'findback_read_own_profile'
          AND cmd = 'SELECT'
          AND 'authenticated' = ANY(roles)
          AND qual LIKE '%user_id%'
    ) THEN
        RAISE EXCEPTION
            'Required student profile SELECT policy is missing. Migration cancelled.';
    END IF;
END;
$$;

DROP POLICY IF EXISTS
    "Students can view own profile"
ON public.student_profiles;
